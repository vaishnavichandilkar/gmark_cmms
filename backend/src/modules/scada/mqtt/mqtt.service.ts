import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import * as mqtt from 'mqtt';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { WebsocketGateway } from '../../scada/websocket/websocket.gateway';
import { BoosterRegisterParserService } from '../../scada/parser/booster-register-parser.service';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient;
  private readonly logger = new Logger(MqttService.name);
  private registerDefinitions: Record<number, any> = {};
  private verifiedDevices = new Set<string>();

  // --- Configuration ---
  private readonly brokerUrl = 'mqtt://mqtt.gmarksoftware.com:1883';
  private readonly username = 'admin';
  private readonly password = 'admin123';

  private readonly topics = [
    'AGC/SE-20260508012',
    'AGC/SE-20260508045',
    'AGC/SE-2026051104',
    'AGC/SE-20260506027',
    'AGC/SE-20260506023',
    'AGC/SE-20260506029',
    'AGC/SE-20260506030',
    'AGC/SE-2026050913',
    'AGC/SE-2026050907',
    'AGC/SE-2026050909',
    'AGC/SE-202605034',
    'AGC/SE-20260508013',
    'AGC/SE-20260526020',
    'AGC/SE-2026050805',
    'AGC/SE-20260508011',
    'AGC/SE-2026050910',
    'AGC/SE-2026050904',
    'AGC/SE-2026050902',
    'AGC/SE-2026051111',
    'AGC/SE-20260506036',
    'AGC/SE-2026051127',
    'AGC/SE-2026051115',
    'AGC/SE-2026051133',
    'AGC/SE-20260508010',
    'AGC/SE-20260526021',
    'AGC/SE-2026050901',
    'AGC/SE-20260223035',
    'AGC/SE-2026052022',
    'AGC/SE-20260526023',
    'AGC/SE-3004202546',
    'AGC/SE-3004202547',
    'AGC/3004202546',
    'AGC/3004202547',
    'AGC/SE-2806202501',
    'AGC/2806202501',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly boosterParser: BoosterRegisterParserService,
  ) {}

  onModuleInit() {
    this.logger.log(`Connecting to MQTT broker at ${this.brokerUrl}`);
    this.client = mqtt.connect(this.brokerUrl, {
      username: this.username,
      password: this.password,
    });

    // Load Register Definitions
    this.prisma.registerDefinition
      .findMany()
      .then((defs) => {
        defs.forEach((def) => {
          this.registerDefinitions[def.address] = def;
        });
        this.logger.log(`Loaded ${defs.length} register definitions`);
      })
      .catch((err) => {
        this.logger.error(
          `Failed to load register definitions: ${err.message}`,
        );
      });

    this.client.on('connect', () => {
      this.logger.log('Connected to MQTT broker');

      this.client.subscribe(this.topics, (err) => {
        if (err) {
          this.logger.error(`Subscription error: ${err.message}`);
        } else {
          this.logger.log(
            `Subscribed to ${this.topics.length} specific topics`,
          );
        }
      });
    });

    this.client.on('message', async (topic, message) => {
      try {
        const messageString = message.toString();
        let payload: any;

        // Check if the message contains a JSON object
        const startIdx = messageString.indexOf('{');
        if (startIdx !== -1) {
          const jsonStr = messageString.substring(startIdx);
          payload = JSON.parse(jsonStr);
        } else {
          // Fallback to normal JSON parse
          payload = JSON.parse(messageString);
        }

        // SCADA-style Terminal Logging
        let logStr = `\n[MQTT] ${topic}\n`;
        if (payload.registers && Array.isArray(payload.registers)) {
          const regStrs = [];
          payload.registers.forEach((r: any) => {
            if (r.register !== undefined && r.value !== undefined) {
              regStrs.push(`Reg${r.register}=${r.value}`);
            }
          });

          const chunkSize = 8;
          for (let i = 0; i < regStrs.length; i += chunkSize) {
            logStr += regStrs.slice(i, i + chunkSize).join(' | ') + '\n';
          }
        } else {
          logStr += `Payload: ${JSON.stringify(payload).substring(0, 200)}\n`;
        }

        console.log(logStr); // Use console.log for proper multiline output

        await this.handleMessage(topic, payload);
      } catch (error) {
        this.logger.error(`Failed to process message on ${topic}:`, error);
      }
    });

    this.client.on('error', (err) => {
      this.logger.error(`MQTT Client Error: ${err.message}`);
    });
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end();
    }
  }

  private async handleMessage(topic: string, payload: any) {
    // Example topic: AGC/SE-2026050901 or AGC/2026050901
    // Extract deviceId from topic.
    const parts = topic.split('/');
    if (parts.length < 2) return;

    let deviceId = parts[1];

    // Some devices might have 'SE-' prefix, remove it to match db id if necessary.
    if (deviceId.startsWith('SE-')) {
      deviceId = deviceId.substring(3);
    }

    // Only proceed if payload contains registers
    if (!payload.registers || !Array.isArray(payload.registers)) return;

    try {
      // 1. Fetch the device from DB (using in-memory cache to optimize)
      if (!this.verifiedDevices.has(deviceId)) {
        const device = await this.prisma.device.findUnique({
          where: { deviceId },
        });

        if (!device) {
          this.logger.warn(`Device ${deviceId} not found in registry`);
          return;
        }
        this.verifiedDevices.add(deviceId);
      }

      // 2. Dynamic parse
      const parsedState: any = { deviceId };
      const registerValuesToUpsert = [];

      for (const reg of payload.registers) {
        const rawAddress = Number(reg.register);
        
        // Dynamic Address Lookup
        // For Fire Panels: address is sent exactly as in the definitions (e.g. 141, 164)
        // For Boosters: address is sent as 1, 2 but definitions are 40001, 40002
        let address = rawAddress;
        let def = this.registerDefinitions[rawAddress];
        
        if (!def && rawAddress < 40000) {
          const normalizedAddress = rawAddress + 40000;
          if (this.registerDefinitions[normalizedAddress]) {
            address = normalizedAddress;
            def = this.registerDefinitions[normalizedAddress];
            reg.register = address; // Normalize only if we matched a 40000-series definition
          }
        }

        const value = Number(reg.value);

        if (def) {
          // Add to parsedState if there's a mapped key
          if (def.mappedKey) {
            // Convert to boolean for specific keys if needed, based on typical frontend logic
            // e.g., statuses are boolean
            if (
              def.mappedKey.includes('Status') ||
              def.mappedKey === 'deviceActive' ||
              def.mappedKey === 'waterAvailable' ||
              def.mappedKey === 'transmitterConnected' ||
              def.mappedKey === 'tankStatus' ||
              def.mappedKey.includes('pressureSwitch') ||
              def.mappedKey.includes('ConfigActivate')
            ) {
              parsedState[def.mappedKey] = value > 0;
            } else if (
              def.mappedKey === 'pressureBar' ||
              def.mappedKey === 'pressuremA'
            ) {
              parsedState[def.mappedKey] = value / 10.0;
            } else {
              parsedState[def.mappedKey] = value;
            }
          }

          // Prepare DeviceRegisterValue
          registerValuesToUpsert.push({
            deviceId,
            registerId: def.id,
            value,
          });
        }
      }

      // 3. Emit instantly to websocket gateway BEFORE any database writes
      this.websocketGateway.emitDeviceUpdate(
        topic,
        deviceId,
        parsedState,
        payload.registers,
      );

      // 4. Perform database operations asynchronously in the background to prevent pool starvation and latency
      this.saveToDatabaseBackground(
        deviceId,
        payload,
        parsedState,
        registerValuesToUpsert,
      ).catch((dbErr) => {
        this.logger.error(
          `Database background save error for device ${deviceId}:`,
          dbErr,
        );
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle message for device ${deviceId}`,
        error,
      );
    }
  }

  private async saveToDatabaseBackground(
    deviceId: string,
    payload: any,
    parsedState: any,
    registerValuesToUpsert: any[],
  ) {
    // A. Save snapshot
    await this.prisma.deviceSnapshot.create({
      data: {
        deviceId,
        payload,
      },
    });

    // B. Save to DeviceRegisterValue concurrently
    if (registerValuesToUpsert.length > 0) {
      await Promise.all(
        registerValuesToUpsert.map((val) =>
          this.prisma.deviceRegisterValue.upsert({
            where: {
              deviceId_registerId: {
                deviceId: val.deviceId,
                registerId: val.registerId,
              },
            },
            update: { value: val.value },
            create: val,
          }),
        ),
      );
    }

    // C. Update DeviceState using the dynamic mapped keys
    if (Object.keys(parsedState).length > 1) {
      // more than just deviceId
      await this.prisma.deviceState.upsert({
        where: { deviceId },
        update: parsedState,
        create: parsedState,
      });
    }

    // D. Update latestData and lastSeen on Device
    await this.prisma.device.update({
      where: { deviceId },
      data: {
        latestData: parsedState,
        lastSeen: new Date(),
      },
    });
  }
}
