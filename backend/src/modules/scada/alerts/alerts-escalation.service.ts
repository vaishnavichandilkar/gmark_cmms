import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { AlertsEmailService } from './email.service';

@Injectable()
export class AlertsEscalationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlertsEscalationService.name);
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly SCAN_INTERVAL_MS = 60 * 1000; // Run scan every 60 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly emailService: AlertsEmailService,
  ) {}

  onModuleInit() {
    this.logger.log('Starting Alert Escalation background monitoring service...');
    this.checkInterval = setInterval(() => {
      this.scanAndEscalateAlerts().catch((err) => {
        this.logger.error(`Error during alert escalation scan: ${err.message}`);
      });
    }, this.SCAN_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      this.logger.log('Alert Escalation service stopped.');
    }
  }

  /**
   * Periodically scans all ACTIVE unacknowledged alerts and promotes them
   * to the next tier in the escalation chain if the delay interval has passed.
   */
  async scanAndEscalateAlerts() {
    const activeAlerts = await this.prisma.deviceAlert.findMany({
      where: {
        status: 'ACTIVE',
        isEscalated: false,
        acknowledgedAt: null,
      },
      include: {
        device: {
          include: {
            building: true,
          },
        },
      },
    });

    if (activeAlerts.length === 0) return;

    for (const alert of activeAlerts) {
      try {
        await this.evaluateAlertForEscalation(alert);
      } catch (err: any) {
        this.logger.error(`Failed to evaluate escalation for alert #${alert.id}: ${err.message}`);
      }
    }
  }

  /**
   * Evaluate a single alert and escalate if past its configured interval
   */
  async evaluateAlertForEscalation(alert: any, forceEscalate: boolean = false) {
    if (alert.acknowledgedAt || alert.status !== 'ACTIVE') {
      return null;
    }

    let config: any = null;

    if (alert.triggerKey && alert.triggerKey.startsWith('reg_')) {
      const regNum = parseInt(alert.triggerKey.replace('reg_', ''), 10);
      if (!isNaN(regNum)) {
        config = await this.prisma.registerAlertConfig.findUnique({
          where: {
            deviceId_registerNumber: {
              deviceId: alert.deviceId,
              registerNumber: regNum,
            },
          },
        });
      }
    }

    // Default policy: enabled if configured, or default true for CRITICAL/EMERGENCY alarms
    const isEscalationEnabled = config ? config.enableEscalation : (alert.type === 'CRITICAL' || alert.type === 'EMERGENCY');
    if (!isEscalationEnabled && !forceEscalate) return;

    // Define hierarchy chain (e.g. OPERATOR -> BUILDING_ADMIN -> SUPER_ADMIN)
    const rawChain = config?.escalationChain || 'OPERATOR,BUILDING_ADMIN,SUPER_ADMIN';
    const chain = rawChain
      .split(',')
      .map((r: string) => r.trim().toUpperCase())
      .filter(Boolean);

    if (chain.length <= 1) return; // Need at least 2 tiers to escalate

    const intervalMinutes = config?.escalationIntervalMinutes || 60;
    const baseTime = alert.lastEscalatedAt || alert.createdAt;
    const elapsedMinutes = (Date.now() - new Date(baseTime).getTime()) / (60 * 1000);

    // Check if time threshold reached
    if (!forceEscalate && elapsedMinutes < intervalMinutes) {
      return;
    }

    const currentLevel = alert.escalationLevel || 1;
    const nextLevelIndex = currentLevel; // 1-indexed level: level 1 is index 0, next is index 1

    if (nextLevelIndex >= chain.length) {
      // Reached apex of escalation chain
      await this.prisma.deviceAlert.update({
        where: { id: alert.id },
        data: { isEscalated: true },
      });
      return;
    }

    const nextRole = chain[nextLevelIndex];
    this.logger.warn(
      `🚨 [ALARM ESCALATION] Alert #${alert.id} (${alert.deviceId}) unacknowledged for ${Math.round(elapsedMinutes)}m. Escalating to Level ${currentLevel + 1} (${nextRole})...`,
    );

    // Resolve recipient emails for the upper role
    const roleResult = await this.resolveRoleEmails([nextRole], alert.deviceId);
    let newEmailSentTo = alert.emailSentTo || '';

    if (roleResult.emails.length > 0) {
      const escalationSubject = `[ALERT ESCALATION - Level ${currentLevel + 1}] Unattended Alarm on ${alert.device?.name || alert.deviceId}`;
      const escalationDetails = `Unacknowledged for ${Math.round(elapsedMinutes)} minutes. Automatically escalated to upper authority: ${nextRole}`;

      await this.emailService.sendAlertEmail({
        to: roleResult.emails,
        deviceId: alert.deviceId,
        deviceName: alert.device?.name,
        alertType: alert.type,
        message: `[ESCALATION Level ${currentLevel + 1} - ${nextRole}] ${alert.message}`,
        intensity: Math.min((alert.intensity || 1) + 1, 5),
        triggerKey: alert.triggerKey,
        conditionDetails: escalationDetails,
        currentValue: 'UNATTENDED',
      });

      const addedEmails = roleResult.emails.join(', ');
      newEmailSentTo = newEmailSentTo ? `${newEmailSentTo}, ${addedEmails}` : addedEmails;
    }

    const updatedRolesNotified = alert.rolesNotified
      ? `${alert.rolesNotified}, ${nextRole}`
      : nextRole;

    const updatedAlert = await this.prisma.deviceAlert.update({
      where: { id: alert.id },
      data: {
        escalationLevel: currentLevel + 1,
        lastEscalatedAt: new Date(),
        rolesNotified: updatedRolesNotified,
        emailSentTo: newEmailSentTo,
        isEscalated: nextLevelIndex + 1 >= chain.length,
      },
    });

    // Broadcast escalation event across WebSockets
    if (this.websocketGateway?.server) {
      this.websocketGateway.server.to(`device-${alert.deviceId}`).emit('device-alert-escalated', updatedAlert);
      this.websocketGateway.server.emit('device-alert-escalated', updatedAlert);
    }

    return updatedAlert;
  }

  /**
   * Helper to resolve emails for a given role
   */
  private async resolveRoleEmails(roles: string[], deviceId?: string): Promise<{ emails: string[]; rolesFound: string[] }> {
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
      if (u.role === 'SUPER_ADMIN') {
        isEligible = true;
      } else if (buildingId && (u.role === 'BUILDING_ADMIN' || u.role === 'OPERATOR' || u.role === 'VIEWER')) {
        const userBuildingIds = u.buildings?.map((b) => b.buildingId) || [];
        if (userBuildingIds.length === 0 || userBuildingIds.includes(buildingId)) {
          isEligible = true;
        }
      } else if (societyId && u.role === 'SOCIETY_ADMIN') {
        if (!u.societyId || u.societyId === societyId) {
          isEligible = true;
        }
      } else {
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
}
