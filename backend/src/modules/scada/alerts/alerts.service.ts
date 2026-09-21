import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  async evaluateState(deviceId: string, parsedState: any, previousState: any) {
    if (!previousState) return; // Need previous state to detect changes

    const alertRules: Array<{ key: string, type: string, msg: string, condition: (val: any) => boolean }> = [
      { key: 'inputPowerFaultType', type: 'CRITICAL', msg: 'Input Power Fault Detected', condition: (val: number) => val > 0 },
      { key: 'pump1FaultType', type: 'WARNING', msg: 'Pump 1 Fault Detected', condition: (val: number) => val > 0 },
      { key: 'pump2FaultType', type: 'WARNING', msg: 'Pump 2 Fault Detected', condition: (val: number) => val > 0 },
      { key: 'pump3FaultType', type: 'WARNING', msg: 'Pump 3 Fault Detected', condition: (val: number) => val > 0 },
      { key: 'pump4FaultType', type: 'WARNING', msg: 'Pump 4 Fault Detected', condition: (val: number) => val > 0 },
      { key: 'waterAvailable', type: 'CRITICAL', msg: 'Low Suction Water Level - Pumps Disabled', condition: (val: boolean) => val === false },
      { key: 'transmitterConnected', type: 'WARNING', msg: 'Pressure Transmitter Disconnected', condition: (val: boolean) => val === false },
    ];

    for (const rule of alertRules) {
      const prevVal = previousState[rule.key];
      const currVal = parsedState[rule.key];

      if (currVal === undefined) continue;

      const prevFault = prevVal !== undefined ? rule.condition(prevVal) : false;
      const currFault = rule.condition(currVal);

      if (!prevFault && currFault) {
        await this.createAlert(deviceId, rule.msg, rule.type, rule.key);
      } else if (prevFault && !currFault) {
        await this.resolveAlert(deviceId, rule.key);
      }
    }
  }

  // --- Dynamic Register Alert Configurations ---

  async getAlertConfigs(deviceId: string) {
    return this.prisma.registerAlertConfig.findMany({
      where: { deviceId },
      orderBy: { registerNumber: 'asc' },
    });
  }

  async getAlertConfig(deviceId: string, registerNumber: number) {
    return this.prisma.registerAlertConfig.findUnique({
      where: {
        deviceId_registerNumber: {
          deviceId,
          registerNumber: Number(registerNumber),
        },
      },
    });
  }

  async upsertAlertConfig(
    deviceId: string,
    data: {
      registerNumber: number;
      registerName?: string;
      enabled?: boolean;
      alertType?: string;
      intensity?: number;
      conditionType: string;
      conditionValue: number;
      message: string;
    },
  ) {
    const regNum = Number(data.registerNumber);
    const condVal = Number(data.conditionValue);
    const intensity = data.intensity !== undefined ? Number(data.intensity) : 1;
    const enabled = data.enabled !== undefined ? Boolean(data.enabled) : true;
    const alertType = data.alertType || 'WARNING';

    const result = await this.prisma.registerAlertConfig.upsert({
      where: {
        deviceId_registerNumber: {
          deviceId,
          registerNumber: regNum,
        },
      },
      update: {
        registerName: data.registerName,
        enabled,
        alertType,
        intensity,
        conditionType: data.conditionType,
        conditionValue: condVal,
        message: data.message,
      },
      create: {
        deviceId,
        registerNumber: regNum,
        registerName: data.registerName,
        enabled,
        alertType,
        intensity,
        conditionType: data.conditionType,
        conditionValue: condVal,
        message: data.message,
      },
    });

    if (!enabled) {
      await this.resolveAlert(deviceId, `reg_${regNum}`);
    }

    return result;
  }

  async deleteAlertConfig(deviceId: string, registerNumber: number) {
    const regNum = Number(registerNumber);
    const result = await this.prisma.registerAlertConfig.deleteMany({
      where: {
        deviceId,
        registerNumber: regNum,
      },
    });

    await this.resolveAlert(deviceId, `reg_${regNum}`);
    return result;
  }

  // Evaluate incoming raw register array against configured alert rules
  async evaluateRegisters(
    deviceId: string,
    rawRegisters: Array<{ register: number | string; value: any }>,
  ) {
    if (!rawRegisters || !Array.isArray(rawRegisters) || rawRegisters.length === 0) {
      return;
    }

    try {
      const configs = await this.prisma.registerAlertConfig.findMany({
        where: { deviceId, enabled: true },
      });

      if (!configs || configs.length === 0) return;

      // Build map of incoming values for rapid lookup
      const regMap = new Map<number, number>();
      for (const r of rawRegisters) {
        const regNum = Number(r.register);
        const val = Number(r.value);
        if (!isNaN(regNum) && !isNaN(val)) {
          regMap.set(regNum, val);
          if (regNum < 40000) regMap.set(regNum + 40000, val);
          if (regNum >= 40000) regMap.set(regNum - 40000, val);
        }
      }

      for (const config of configs) {
        const regValue = regMap.get(config.registerNumber);
        if (regValue === undefined) continue;

        let isTriggered = false;
        const condVal = Number(config.conditionValue);

        switch (config.conditionType) {
          case 'GREATER_THAN':
            isTriggered = regValue > condVal;
            break;
          case 'LESS_THAN':
            isTriggered = regValue < condVal;
            break;
          case 'EQUAL_TO':
            isTriggered = Math.abs(regValue - condVal) < 0.0001;
            break;
          case 'NOT_EQUAL_TO':
            isTriggered = Math.abs(regValue - condVal) >= 0.0001;
            break;
          case 'GTE':
            isTriggered = regValue >= condVal;
            break;
          case 'LTE':
            isTriggered = regValue <= condVal;
            break;
          default:
            break;
        }

        const triggerKey = `reg_${config.registerNumber}`;
        if (isTriggered) {
          const alertMsg =
            config.message && config.message.trim().length > 0
              ? config.message
              : `Register ${config.registerNumber} Alert: value is ${regValue}`;

          await this.createAlert(
            deviceId,
            alertMsg,
            config.alertType || 'WARNING',
            triggerKey,
            config.intensity || 1,
          );
        } else {
          await this.resolveAlert(deviceId, triggerKey);
        }
      }
    } catch (err: any) {
      this.logger.error(
        `Error evaluating register alerts for ${deviceId}: ${err.message}`,
      );
    }
  }

  async createAlert(
    deviceId: string,
    message: string,
    type: string,
    triggerKey: string,
    intensity: number = 1,
  ) {
    try {
      const existing = await this.prisma.deviceAlert.findFirst({
        where: { deviceId, triggerKey, status: 'ACTIVE' },
      });

      if (existing) return;

      const alert = await this.prisma.deviceAlert.create({
        data: {
          deviceId,
          message,
          type,
          triggerKey,
          intensity,
          status: 'ACTIVE',
        },
      });

      // Emit to device room and global broadcast
      if (this.websocketGateway?.server) {
        this.websocketGateway.server.to(`device-${deviceId}`).emit('device-alert', alert);
        this.websocketGateway.server.emit('device-alert', alert);
      }
      this.logger.warn(`Alert Created [${deviceId}]: ${message} (Type: ${type}, Intensity: ${intensity})`);
    } catch (err: any) {
      this.logger.error(`Error creating alert for ${deviceId}: ${err.message}`);
    }
  }

  async resolveAlert(deviceId: string, triggerKey: string) {
    try {
      const activeAlerts = await this.prisma.deviceAlert.findMany({
        where: { deviceId, triggerKey, status: 'ACTIVE' },
      });

      for (const alert of activeAlerts) {
        const resolved = await this.prisma.deviceAlert.update({
          where: { id: alert.id },
          data: { status: 'RESOLVED', resolvedAt: new Date() },
        });

        if (this.websocketGateway?.server) {
          this.websocketGateway.server.to(`device-${deviceId}`).emit('device-alert-resolved', resolved);
          this.websocketGateway.server.emit('device-alert-resolved', resolved);
        }
        this.logger.log(`Alert Resolved [${deviceId}]: ${resolved.message}`);
      }
    } catch (err: any) {
      this.logger.error(`Error resolving alert for ${deviceId}: ${err.message}`);
    }
  }

  async getActiveAlerts(deviceId: string) {
    return this.prisma.deviceAlert.findMany({
      where: { deviceId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }
}
