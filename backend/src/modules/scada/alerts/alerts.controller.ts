import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly prisma: PrismaService,
  ) {}

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
  async acknowledgeAlert(@Param('id') id: string) {
    return this.prisma.deviceAlert.update({
      where: { id: parseInt(id, 10) },
      data: { status: 'ACKNOWLEDGED', resolvedAt: new Date() },
    });
  }
}
