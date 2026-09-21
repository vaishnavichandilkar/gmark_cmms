import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { UpsertAlertConfigDto } from './dto/alert-config.dto';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly prisma: PrismaService,
  ) {}

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
  async acknowledgeAlert(@Param('id') id: string) {
    return this.prisma.deviceAlert.update({
      where: { id: parseInt(id, 10) },
      data: { status: 'ACKNOWLEDGED', resolvedAt: new Date() },
    });
  }
}

