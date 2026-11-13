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
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient;
  private readonly logger = new Logger(MqttService.name);
  private registerDefinitions: Record<number, any> = {};
  private verifiedDevices = new Set<string>();
  private historyConfigs = new Map<
    string,
    {
      historyEnabled: boolean;
      historyMode: string;
      historyInterval: string;
      lastSaved: number;
    }
  >();

  updateHistoryConfigCache(
    deviceId: string,
    config: {
      historyEnabled: boolean;
      historyMode: string;
      historyInterval: string;
    },
  ) {
    const existing = this.historyConfigs.get(deviceId);
    this.historyConfigs.set(deviceId, {
      ...config,
      lastSaved: existing?.lastSaved || 0,
    });
  }

  // --- Publishing ---
  async publishCommand(deviceId: string, command: any) {
    if (!this.client || !this.client.connected) {
      this.logger.error(`Cannot publish command to ${deviceId}: MQTT client not connected.`);
      return false;
    }

    // If the command specifies a precise topic (like Modbus REQ), use it EXACTLY as provided
    // Otherwise fallback to AGC/{deviceId}
    const targetTopic = command.topic ? command.topic : `AGC/${deviceId}`;

    // Remove the topic from the payload before publishing
    const { topic: _t, ...payloadData } = command;
    const payload = JSON.stringify(payloadData);

    // 1. Publish primary command
    this.client.publish(targetTopic, payload, (err) => {
      if (err) {
        this.logger.error(`Failed to publish command to ${targetTopic}: ${err.message}`);
      } else {
        this.logger.log(`Published command to ${targetTopic}: ${payload}`);
      }
    });

    const regNum = parseInt(command.register, 10);
    const isLong = !isNaN(regNum) && regNum >= 40000;
    const shortReg = !isNaN(regNum) ? (isLong ? regNum - 40000 : regNum) : NaN;

    // 2. Publish alternate Modbus register format (both short 1-4 and 40001-40004) if applicable
    if (!isNaN(regNum)) {
      const longReg = isLong ? regNum : regNum + 40000;
      const altReg = isLong ? shortReg : longReg;

      const altPayload = JSON.stringify({ ...payloadData, register: altReg.toString() });
      this.client.publish(targetTopic, altPayload, (err) => {
        if (!err) {
          this.logger.log(`Published alternate register command to ${targetTopic}: ${altPayload}`);
        }
      });
    }

    return true;
  }

  // --- Configuration ---
  private readonly defaultBrokerUrl = 'mqtt://mqtt.gmarksoftware.com:1883';
  private readonly fallbackBrokerUrl = 'mqtt://13.204.57.212:1883';
  private currentBrokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://mqtt.gmarksoftware.com:1883';
  private readonly username = process.env.MQTT_USERNAME || 'admin';
  private readonly password = process.env.MQTT_PASSWORD || 'admin123';
  private hasFallenBack = false;
  private lastLoggedError = '';
  private lastLoggedErrorTime = 0;

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
    private readonly alertsService: AlertsService,
  ) {}

  onModuleInit() {
    if (process.env.MQTT_ENABLED === 'false' || process.env.DISABLE_MQTT === 'true') {
      this.logger.warn('MQTT client disabled via environment configuration (MQTT_ENABLED=false).');
      return;
    }

    this.connectClient();

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
  }

  private connectClient() {
    if (this.client) {
      try {
        this.client.removeAllListeners();
        this.client.end(true);
      } catch (_) {}
    }

    this.logger.log(`Connecting to MQTT broker at ${this.currentBrokerUrl}`);
    this.client = mqtt.connect(this.currentBrokerUrl, {
      username: this.username,
      password: this.password,
      reconnectPeriod: 5000,
      connectTimeout: 5000,
    });

    this.client.on('connect', () => {
      this.logger.log(`Successfully connected to MQTT broker at ${this.currentBrokerUrl}`);
      this.lastLoggedError = '';

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

    this.client.on('error', (err: any) => {
      const errMsg = err?.message || String(err);

      // If DNS resolution fails (ENOTFOUND) and we haven't tried the fallback IP yet:
      if (errMsg.includes('ENOTFOUND') && !this.hasFallenBack) {
        this.hasFallenBack = true;
        this.logger.warn(
          `DNS lookup failed for ${this.currentBrokerUrl}. Automatically falling back to direct IP broker: ${this.fallbackBrokerUrl}`,
        );
        this.currentBrokerUrl = this.fallbackBrokerUrl;
        this.connectClient();
        return;
      }

      // De-duplicate & throttle repetitive connection error logs to once every 30 seconds
      const now = Date.now();
      if (errMsg !== this.lastLoggedError || now - this.lastLoggedErrorTime > 30000) {
        this.lastLoggedError = errMsg;
        this.lastLoggedErrorTime = now;
        this.logger.error(`MQTT Client Error: ${errMsg} (Retrying every 5s...)`);
      }
    });
  }

  onModuleDestroy() {
    if (this.client) {
      try {
        this.client.removeAllListeners();
        this.client.end(true);
      } catch (_) {}
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
    // 0. Fetch previous state for alerts before updating
    let previousState = null;
    if (Object.keys(parsedState).length > 1) {
      previousState = await this.prisma.deviceState.findUnique({
        where: { deviceId },
      });
    }

    // A. Save snapshot according to Device History Configuration
    let config = this.historyConfigs.get(deviceId);
    if (!config) {
      const dev = await this.prisma.device.findUnique({
        where: { deviceId },
        select: {
          historyEnabled: true,
          historyMode: true,
          historyInterval: true,
          lastHistoryAt: true,
        },
      });
      config = {
        historyEnabled: dev?.historyEnabled ?? false,
        historyMode: dev?.historyMode ?? 'Time-based',
        historyInterval: dev?.historyInterval ?? 'minute',
        lastSaved: dev?.lastHistoryAt
          ? new Date(dev.lastHistoryAt).getTime()
          : 0,
      };
      this.historyConfigs.set(deviceId, config);
    }

    if (config.historyEnabled) {
      let shouldSave = false;
      const now = Date.now();

      if (config.historyMode === 'Time-based') {
        let intervalMs = 60 * 1000; // minute default
        if (config.historyInterval === 'hour') intervalMs = 60 * 60 * 1000;
        else if (config.historyInterval === 'day') intervalMs = 24 * 60 * 60 * 1000;

        if (now - config.lastSaved >= intervalMs || config.lastSaved === 0) {
          shouldSave = true;
        }
      } else if (config.historyMode === 'Conditional') {
        if (!previousState) {
          shouldSave = true;
        } else {
          const stateChanged =
            previousState.motor1Status !== parsedState.motor1Status ||
            previousState.motor2Status !== parsedState.motor2Status ||
            previousState.motor3Status !== parsedState.motor3Status ||
            previousState.motor4Status !== parsedState.motor4Status ||
            previousState.waterAvailable !== parsedState.waterAvailable ||
            previousState.inputPowerFaultType !== parsedState.inputPowerFaultType ||
            Math.abs(
              (previousState.pressureBar || 0) - (parsedState.pressureBar || 0),
            ) >= 0.3;

          if (stateChanged) {
            shouldSave = true;
          }
        }
      }

      if (shouldSave) {
        config.lastSaved = now;
        await this.prisma.deviceSnapshot.create({
          data: {
            deviceId,
            historyMode: config.historyMode,
            payload: {
              ...payload,
              parsedState,
            },
          },
        });

        this.prisma.device
          .update({
            where: { deviceId },
            data: { lastHistoryAt: new Date(now) },
          })
          .catch(() => {});
      }
    }

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

    // E. Evaluate Alerts
    if (previousState) {
      await this.alertsService.evaluateState(deviceId, parsedState, previousState);
    }

    // F. Evaluate Dynamic Register Alerts
    if (payload?.registers && Array.isArray(payload.registers)) {
      await this.alertsService.evaluateRegisters(deviceId, payload.registers);
    }
  }
}
