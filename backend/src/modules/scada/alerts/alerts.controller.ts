import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { UpsertAlertConfigDto } from './dto/alert-config.dto';
import { AlertsEmailService } from './email.service';
import { AlertsEscalationService } from './alerts-escalation.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly prisma: PrismaService,
    private readonly emailService: AlertsEmailService,
    private readonly escalationService: AlertsEscalationService,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  @Post('test-email')
  async sendTestEmail(@Body() body: { email?: string; deviceId?: string; roles?: string[] }) {
    const recipients = new Set<string>();
    let rolesFound: string[] = [];

    // 1. Resolve role-based recipients if roles specified
    if (body.roles && body.roles.length > 0) {
      const roleResult = await this.alertsService.getEmailsForRoles(body.roles, body.deviceId);
      roleResult.emails.forEach((e) => recipients.add(e));
      rolesFound = roleResult.rolesFound;
    }

    // 2. Add explicit email if provided
    if (body.email && body.email.includes('@')) {
      recipients.add(body.email.trim());
    }

    // 3. Fallback to system default if still empty
    if (recipients.size === 0 && process.env.ALERT_DEFAULT_EMAILS) {
      process.env.ALERT_DEFAULT_EMAILS
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e && e.includes('@'))
        .forEach((e) => recipients.add(e));
    }

    const recipientList = Array.from(recipients);
    if (recipientList.length === 0) {
      return {
        success: false,
        error: 'No valid user emails found for the selected roles or address',
      };
    }

    const result = await this.emailService.sendAlertEmail({
      to: recipientList,
      deviceId: body.deviceId || 'TEST-DEVICE-01',
      deviceName: 'Device Telemetry Monitor',
      alertType: 'WARNING',
      message: `Test Alert: Verified delivery for roles [${rolesFound.join(', ') || 'Custom'}]`,
      intensity: 3,
      triggerKey: 'test_role_alert',
      conditionDetails: `Role-based verification test for ${rolesFound.join(', ') || 'Manual Email'}`,
      currentValue: 'OK',
    });

    return {
      ...result,
      rolesFound,
    };
  }

  @Get('email-status')
  async getEmailStatus() {
    return this.emailService.getStatus();
  }

  @Get('config/:deviceId')
  async getAlertConfigs(@Param('deviceId') deviceId: string) {
    return this.alertsService.getAlertConfigs(deviceId);
  }

  @Get('config/:deviceId/:registerNumber')
  async getAlertConfig(
    @Param('deviceId') deviceId: string,
    @Param('registerNumber') registerNumber: string,
  ) {
    return this.alertsService.getAlertConfig(deviceId, parseInt(registerNumber, 10));
  }

  @Post('config/:deviceId')
  async saveAlertConfig(
    @Param('deviceId') deviceId: string,
    @Body() body: UpsertAlertConfigDto,
  ) {
    return this.alertsService.upsertAlertConfig(deviceId, body);
  }

  @Delete('config/:deviceId/:registerNumber')
  async deleteAlertConfig(
    @Param('deviceId') deviceId: string,
    @Param('registerNumber') registerNumber: string,
  ) {
    return this.alertsService.deleteAlertConfig(deviceId, parseInt(registerNumber, 10));
  }

  @Get('active/all')
  async getAllActiveAlerts() {
    return this.prisma.deviceAlert.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @Get(':deviceId')
  async getDeviceAlerts(@Param('deviceId') deviceId: string) {
    return this.prisma.deviceAlert.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @Get(':deviceId/active')
  async getActiveAlerts(@Param('deviceId') deviceId: string) {
    return this.alertsService.getActiveAlerts(deviceId);
  }

  @Post(':id/acknowledge')
  async acknowledgeAlert(@Param('id') id: string, @Request() req?: any) {
    const alertId = parseInt(id, 10);
    const username = req?.user?.username || req?.user?.email || 'Operator';
    const updated = await this.prisma.deviceAlert.update({
      where: { id: alertId },
      data: {
        status: 'ACKNOWLEDGED',
        resolvedAt: new Date(),
        acknowledgedAt: new Date(),
        acknowledgedBy: username,
      },
    });

    if (this.websocketGateway?.server) {
      this.websocketGateway.server.emit('device-alert-resolved', updated);
      this.websocketGateway.server.to(`device-${updated.deviceId}`).emit('device-alert-resolved', updated);
    }

    return updated;
  }

  @Post(':id/escalate-now')
  async triggerManualEscalation(@Param('id') id: string) {
    const alertId = parseInt(id, 10);
    const alert = await this.prisma.deviceAlert.findUnique({
      where: { id: alertId },
      include: { device: { include: { building: true } } },
    });
    if (!alert) throw new NotFoundException('Alert not found');
    return this.escalationService.evaluateAlertForEscalation(alert, true);
  }
}

