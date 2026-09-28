import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { AlertsEmailService } from './email.service';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly emailService: AlertsEmailService,
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
        await this.createAlert(deviceId, rule.msg, rule.type, rule.key, 2, {
          conditionDetails: `System State [${rule.key}] faulted`,
          currentValue: currVal,
          sendEmail: true,
          notifyRoles: 'SUPER_ADMIN,BUILDING_ADMIN,OPERATOR',
        });
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

  /**
   * Resolve active user emails matching target roles (with building/society scoping)
   */
  async getEmailsForRoles(roles: string[], deviceId?: string): Promise<{ emails: string[]; rolesFound: string[] }> {
    if (!roles || roles.length === 0) {
      return { emails: [], rolesFound: [] };
    }

    const targetRoles = roles.map((r) => r.trim().toUpperCase()).filter(Boolean);
    if (targetRoles.length === 0) return { emails: [], rolesFound: [] };

    let buildingId: number | null = null;
    let societyId: number | null = null;

    if (deviceId) {
      const dev = await this.prisma.device.findUnique({
        where: { deviceId },
        include: { building: true },
      });
      if (dev) {
        buildingId = dev.buildingId;
        societyId = dev.building?.societyId || null;
      }
    }

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: targetRoles as any },
      },
      include: {
        buildings: true,
      },
    });

    const matchedEmails = new Set<string>();
    const matchedRoles = new Set<string>();

    for (const u of users) {
      if (!u.email || !u.email.includes('@')) continue;

      let isEligible = false;

      // SUPER_ADMIN is always notified system-wide
      if (u.role === 'SUPER_ADMIN') {
        isEligible = true;
      }
      // BUILDING_ADMIN, OPERATOR, VIEWER scoped to building if device has building
      else if (buildingId && (u.role === 'BUILDING_ADMIN' || u.role === 'OPERATOR' || u.role === 'VIEWER')) {
        const userBuildingIds = u.buildings?.map((b) => b.buildingId) || [];
        if (userBuildingIds.length === 0 || userBuildingIds.includes(buildingId)) {
          isEligible = true;
        }
      }
      // SOCIETY_ADMIN scoped to society if device has society
      else if (societyId && u.role === 'SOCIETY_ADMIN') {
        if (!u.societyId || u.societyId === societyId) {
          isEligible = true;
        }
      }
      // Fallback: If device has no building/society, include matching role
      else {
        isEligible = true;
      }

      if (isEligible) {
        matchedEmails.add(u.email.trim());
        matchedRoles.add(u.role);
      }
    }

    return {
      emails: Array.from(matchedEmails),
      rolesFound: Array.from(matchedRoles),
    };
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
      sendEmail?: boolean;
      emailRecipients?: string;
      notifyRoles?: string;
      enableEscalation?: boolean;
      escalationIntervalMinutes?: number;
      escalationChain?: string;
    },
  ) {
    const regNum = Number(data.registerNumber);
    const condVal = Number(data.conditionValue);
    const intensity = data.intensity !== undefined ? Number(data.intensity) : 1;
    const enabled = data.enabled !== undefined ? Boolean(data.enabled) : true;
    const alertType = data.alertType || 'WARNING';
    const sendEmail = data.sendEmail !== undefined ? Boolean(data.sendEmail) : true;
    const emailRecipients = data.emailRecipients ? data.emailRecipients.trim() : null;
    const notifyRoles = data.notifyRoles ? data.notifyRoles.trim() : 'SUPER_ADMIN,BUILDING_ADMIN,OPERATOR';
    const enableEscalation = data.enableEscalation !== undefined ? Boolean(data.enableEscalation) : false;
    const escalationIntervalMinutes = data.escalationIntervalMinutes ? Number(data.escalationIntervalMinutes) : 60;
    const escalationChain = data.escalationChain ? data.escalationChain.trim() : 'OPERATOR,BUILDING_ADMIN,SUPER_ADMIN';

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
        sendEmail,
        emailRecipients,
        notifyRoles,
        enableEscalation,
        escalationIntervalMinutes,
        escalationChain,
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
        sendEmail,
        emailRecipients,
        notifyRoles,
        enableEscalation,
        escalationIntervalMinutes,
        escalationChain,
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
            {
              sendEmail: config.sendEmail,
              emailRecipients: config.emailRecipients || undefined,
              notifyRoles: config.notifyRoles || 'SUPER_ADMIN,BUILDING_ADMIN,OPERATOR',
              enableEscalation: config.enableEscalation,
              escalationChain: config.escalationChain || 'OPERATOR,BUILDING_ADMIN,SUPER_ADMIN',
              conditionDetails: `${config.registerName || 'Reg ' + config.registerNumber} ${config.conditionType.replace(/_/g, ' ')} ${config.conditionValue}`,
              currentValue: regValue,
            },
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
    meta?: {
      sendEmail?: boolean;
      emailRecipients?: string;
      notifyRoles?: string;
      enableEscalation?: boolean;
      escalationChain?: string;
      conditionDetails?: string;
      currentValue?: number | string;
    },
  ) {
    try {
      const existing = await this.prisma.deviceAlert.findFirst({
        where: { deviceId, triggerKey, status: 'ACTIVE' },
      });

      if (existing) return;

      // Check device details for richer alerts
      const device = await this.prisma.device.findUnique({
        where: { deviceId },
        include: {
          building: {
            include: {
              society: true,
            },
          },
        },
      });

      let emailSent = false;
      let emailSentTo: string | null = null;
      let rolesNotified: string | null = null;

      // Determine recipients if email is enabled
      const shouldEmail = meta?.sendEmail !== false;
      if (shouldEmail) {
        const recipientsSet = new Set<string>();

        // 1. Resolve role-based recipients
        let targetRoles: string[];
        if (meta?.enableEscalation) {
          // When tiered escalation is active, Tier 1 is routed specifically to the initial role (e.g. OPERATOR)
          const chain = (meta.escalationChain || 'OPERATOR,BUILDING_ADMIN,SUPER_ADMIN')
            .split(',')
            .map((r) => r.trim().toUpperCase())
            .filter(Boolean);
          targetRoles = chain.length > 0 ? [chain[0]] : ['OPERATOR'];
        } else {
          targetRoles = (meta?.notifyRoles || 'SUPER_ADMIN,BUILDING_ADMIN,OPERATOR')
            .split(',')
            .map((r) => r.trim().toUpperCase())
            .filter(Boolean);
        }

        const roleResult = await this.getEmailsForRoles(targetRoles, deviceId);
        roleResult.emails.forEach((e) => recipientsSet.add(e));
        if (roleResult.rolesFound.length > 0) {
          rolesNotified = roleResult.rolesFound.join(', ');
        }

        // 2. Configured custom recipients on rule
        if (meta?.emailRecipients) {
          meta.emailRecipients
            .split(',')
            .map((e) => e.trim())
            .filter((e) => e && e.includes('@'))
            .forEach((e) => recipientsSet.add(e));
        }

        // 3. Default system emails from environment if none specified
        if (recipientsSet.size === 0 && process.env.ALERT_DEFAULT_EMAILS) {
          process.env.ALERT_DEFAULT_EMAILS
            .split(',')
            .map((e) => e.trim())
            .filter((e) => e && e.includes('@'))
            .forEach((e) => recipientsSet.add(e));
        }

        // 4. If still empty, find any admin user email
        if (recipientsSet.size === 0) {
          const adminUser = await this.prisma.user.findFirst({
            where: { isActive: true },
            select: { email: true },
          });
          if (adminUser?.email) {
            recipientsSet.add(adminUser.email);
          }
        }

        const recipientsList = Array.from(recipientsSet);

        if (recipientsList.length > 0) {
          const emailResult = await this.emailService.sendAlertEmail({
            to: recipientsList,
            deviceId,
            deviceName: device?.name,
            alertType: type,
            message,
            intensity,
            triggerKey,
            conditionDetails: meta?.conditionDetails,
            currentValue: meta?.currentValue,
          });

          if (emailResult.success && emailResult.sentTo.length > 0) {
            emailSent = true;
            emailSentTo = emailResult.sentTo.join(', ');
          }
        }
      }

      const alert = await this.prisma.deviceAlert.create({
        data: {
          deviceId,
          message,
          type,
          triggerKey,
          intensity,
          status: 'ACTIVE',
          emailSent,
          emailSentTo,
          rolesNotified,
          escalationLevel: 1,
          lastEscalatedAt: new Date(),
        },
      });

      // Emit to device room and global broadcast
      if (this.websocketGateway?.server) {
        this.websocketGateway.server.to(`device-${deviceId}`).emit('device-alert', alert);
        this.websocketGateway.server.emit('device-alert', alert);
      }
      this.logger.warn(
        `Alert Created [${deviceId}]: ${message} (Type: ${type}, Intensity: ${intensity}, EmailSent: ${emailSent} -> Roles: ${rolesNotified || 'None'}, To: ${emailSentTo || 'None'})`,
      );
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
