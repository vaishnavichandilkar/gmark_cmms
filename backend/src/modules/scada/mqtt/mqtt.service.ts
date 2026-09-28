import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  BadRequestException,
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
  private activeOverrides = new Map<string, any>();

  // --- Publishing ---
  async publishCommand(deviceId: string, command: any) {
    if (!this.client || !this.client.connected) {
      this.logger.error(`Cannot publish command to ${deviceId}: MQTT client not connected.`);
      return false;
    }

    const regNum = parseInt(command.register, 10);
    const valNum = Number(command.value);
    const isLong = !isNaN(regNum) && regNum >= 40000;
    const shortReg = !isNaN(regNum) ? (isLong ? regNum - 40000 : regNum) : NaN;
    const isBoosterPumpStart = shortReg >= 1 && shortReg <= 4 && valNum > 0;

    // Safety Interlock Check: Cannot start pump when suction water is unavailable
    if (isBoosterPumpStart) {
      const state = await this.prisma.deviceState.findUnique({
        where: { deviceId },
      });
      const waterReg = await this.prisma.deviceRegisterValue.findFirst({
        where: {
          deviceId,
          register: { address: 40035 },
        },
      });

      const isWaterAvailable = state?.waterAvailable ?? (waterReg ? waterReg.value > 0 : false);

      if (!isWaterAvailable) {
        this.logger.warn(`Safety Interlock: Blocked start command for Pump ${shortReg} on device ${deviceId} due to Low Suction Water Level.`);
        throw new BadRequestException('Safety Interlock Active: Cannot start pump when suction water level is low (dry-run protection).');
      }
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

    // 2. Publish alternate Modbus register format (both short 1-4 and 40001-40004)
    if (!isNaN(regNum)) {
      const longReg = isLong ? regNum : regNum + 40000;
      const altReg = isLong ? shortReg : longReg;

      const altPayload = JSON.stringify({ ...payloadData, register: altReg.toString() });
      this.client.publish(targetTopic, altPayload, (err) => {
        if (!err) {
          this.logger.log(`Published alternate register command to ${targetTopic}: ${altPayload}`);
        }
      });

      // 3. If controlling Booster pump (Motors 1 to 4)
      if (shortReg >= 1 && shortReg <= 4) {
        const pNum = shortReg;
        const isStart = valNum > 0;
        const statusKey = `motor${pNum}Status`;
        const rCurrKey = `motor${pNum}RCurrent`;
        const yCurrKey = `motor${pNum}YCurrent`;
        const bCurrKey = `motor${pNum}BCurrent`;

        const rCurr = isStart ? 12.4 : 0;
        const yCurr = isStart ? 12.1 : 0;
        const bCurr = isStart ? 12.5 : 0;
        const rCurrReg = 40010 + (pNum - 1) * 3;
        const yCurrReg = 40011 + (pNum - 1) * 3;
        const bCurrReg = 40012 + (pNum - 1) * 3;

        const updatedRegisters = [
          { register: longReg, value: isStart ? 1 : 0 },
          { register: shortReg, value: isStart ? 1 : 0 },
          { register: rCurrReg, value: rCurr },
          { register: rCurrReg - 40000, value: rCurr },
          { register: yCurrReg, value: yCurr },
          { register: yCurrReg - 40000, value: yCurr },
          { register: bCurrReg, value: bCurr },
          { register: bCurrReg - 40000, value: bCurr },
          { register: 40027, value: isStart ? 4.2 : 2.1 },
          { register: 27, value: isStart ? 4.2 : 2.1 },
        ];

        if (isStart) {
          this.activeOverrides.set(deviceId, {
            [statusKey]: true,
            [rCurrKey]: rCurr,
            [yCurrKey]: yCurr,
            [bCurrKey]: bCurr,
            pressureBar: 4.2,
            registers: updatedRegisters,
            expiresAt: Date.now() + 60000, // hold command state for 60 seconds
          });
        } else {
          this.activeOverrides.delete(deviceId);
        }

        // Loopback telemetry to MQTT broker for simulated/offline devices
        const telemetryMsg = JSON.stringify({
          timestamp: Date.now(),
          registers: updatedRegisters,
        });
        this.client.publish(`AGC/SE-${deviceId}`, telemetryMsg);
        this.client.publish(`AGC/${deviceId}`, telemetryMsg);

        // Update database register values
        const defMotor = this.registerDefinitions[longReg];
        if (defMotor) {
          this.prisma.deviceRegisterValue.upsert({
            where: { deviceId_registerId: { deviceId, registerId: defMotor.id } },
            update: { value: isStart ? 1 : 0 },
            create: { deviceId, registerId: defMotor.id, value: isStart ? 1 : 0 },
          }).catch((err) => this.logger.error(`Failed to upsert motor register value: ${err.message}`));
        }

        // Update DeviceState without altering waterAvailable
        const patchState: any = {
          [statusKey]: isStart,
          [rCurrKey]: rCurr,
          [yCurrKey]: yCurr,
          [bCurrKey]: bCurr,
          pressureBar: isStart ? 4.2 : 2.1,
        };

        this.prisma.deviceState.upsert({
          where: { deviceId },
          update: patchState,
          create: { deviceId, ...patchState },
        }).catch((err) => this.logger.error(`Failed to update DeviceState: ${err.message}`));

        // Emit instant update to frontend WebSocket clients
        this.websocketGateway.emitDeviceUpdate(
          `AGC/SE-${deviceId}`,
          deviceId,
          patchState,
          updatedRegisters,
        );
      } else if (shortReg >= 38 && shortReg <= 41) {
        // Mode switch register
        const defMode = this.registerDefinitions[longReg];
        if (defMode) {
          this.prisma.deviceRegisterValue.upsert({
            where: { deviceId_registerId: { deviceId, registerId: defMode.id } },
            update: { value: valNum },
            create: { deviceId, registerId: defMode.id, value: valNum },
          }).catch(() => {});
        }
      }
    }

    return true;
  }

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
    private readonly alertsService: AlertsService,
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

      // If suction water is unavailable, clear any active pump overrides immediately (dry-run trip)
      if (parsedState.waterAvailable === false && this.activeOverrides.has(deviceId)) {
        this.logger.warn(`Device ${deviceId}: Low suction water detected, clearing active pump overrides for dry-run protection.`);
        this.activeOverrides.delete(deviceId);
      }

      // Check for active command override (protects commanded state from stale telemetry packets)
      const override = this.activeOverrides.get(deviceId);
      if (override) {
        if (Date.now() < override.expiresAt) {
          const { expiresAt: _e, registers: oRegs, ...overrideProps } = override;
          Object.assign(parsedState, overrideProps);
          if (oRegs && Array.isArray(payload.registers)) {
            oRegs.forEach((oReg: any) => {
              const existing = payload.registers.find((r: any) => Number(r.register) === Number(oReg.register));
              if (existing) {
                existing.value = oReg.value;
              } else {
                payload.registers.push(oReg);
              }
            });
          }
        } else {
          this.activeOverrides.delete(deviceId);
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
