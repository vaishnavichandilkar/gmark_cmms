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

  async createAlert(deviceId: string, message: string, type: string, triggerKey: string) {
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
          status: 'ACTIVE',
        },
      });

      this.websocketGateway.server.to(`device-${deviceId}`).emit('device-alert', alert);
      this.logger.warn(`Alert Created [${deviceId}]: ${message}`);
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

        this.websocketGateway.server.to(`device-${deviceId}`).emit('device-alert-resolved', resolved);
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
