import {
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  Body,
  ParseIntPipe,
  UseGuards,
  Ip,
  Query,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { BuildingAccessGuard } from '../../core/auth/guards/building-access.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { AuditLogService } from '../../core/audit-log/audit-log.service';

import { MqttService } from '../mqtt/mqtt.service';

@ApiTags('devices')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard, BuildingAccessGuard)
@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly auditLogService: AuditLogService,
    private readonly mqttService: MqttService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all devices' })
  @ApiResponse({ status: 200, description: 'Return all devices.' })
  async getAllDevices(@CurrentUser() user: any) {
    return this.devicesService.getAllDevices(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific device by ID' })
  @ApiParam({ name: 'id', description: 'Device ID' })
  @ApiResponse({ status: 200, description: 'Return the device.' })
  @ApiResponse({ status: 404, description: 'Device not found.' })
  async getDeviceById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.devicesService.getDeviceById(id, user);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SOCIETY_ADMIN)
  @ApiOperation({ summary: 'Create a new device' })
  @ApiResponse({ status: 201, description: 'Device created successfully.' })
  async createDevice(
    @Body()
    body: {
      name: string;
      deviceId: string;
      buildingId?: number;
      application?: string;
      pumpType?: string;
      controller?: string;
      macType?: string;
    },
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const result = await this.devicesService.create(body);
    await this.auditLogService.create(
      user.userId,
      `Device Created: ${result.name} (ID: ${result.id}, Device ID: ${result.deviceId})`,
      'DEVICES',
      ip,
    );
    return result;
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SOCIETY_ADMIN)
  @ApiOperation({ summary: 'Update an existing device' })
  @ApiParam({ name: 'id', description: 'Device ID' })
  @ApiResponse({ status: 200, description: 'Device updated successfully.' })
  @ApiResponse({ status: 404, description: 'Device not found.' })
  async updateDevice(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name: string;
      deviceId: string;
      buildingId?: number;
      application?: string;
      pumpType?: string;
      controller?: string;
      macType?: string;
    },
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const result = await this.devicesService.update(id, body);
    await this.auditLogService.create(
      user.userId,
      `Device Updated: ${result.name} (ID: ${result.id}, Device ID: ${result.deviceId})`,
      'DEVICES',
      ip,
    );
    return result;
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SOCIETY_ADMIN)
  @ApiOperation({ summary: 'Delete a device' })
  @ApiParam({ name: 'id', description: 'Device ID' })
  @ApiResponse({ status: 200, description: 'Device deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Device not found.' })
  async deleteDevice(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const result = await this.devicesService.remove(id);
    await this.auditLogService.create(
      user.userId,
      `Device Deleted: ID ${id}`,
      'DEVICES',
      ip,
    );
    return result;
  }

  @Post(':deviceId/command')
  @ApiOperation({ summary: 'Send a command to a specific device' })
  @ApiParam({ name: 'deviceId', description: 'Device ID string' })
  @ApiResponse({ status: 200, description: 'Command published successfully.' })
  @ApiResponse({ status: 400, description: 'Safety interlock violation.' })
  @ApiResponse({ status: 401, description: 'Invalid password.' })
  async sendCommand(
    @Param('deviceId') deviceId: string,
    @Body() body: { command: any; password?: string },
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const { device, machine } = await this.devicesService.getDeviceByDeviceId(deviceId);
    if (
      (device &&
        (device.template?.toLowerCase() === 'booster' ||
          device.template?.toLowerCase() === 'booster_pump')) ||
      machine?.machineType?.toUpperCase() === 'HYPN' ||
      machine?.machineCategory?.toUpperCase() === 'HYPN'
    ) {
      throw new BadRequestException(
        'Remote control is disabled for HYPN / Booster systems. Telemetry monitoring only.',
      );
    }

    // Basic fixed PIN check for now. Later can be verified against user.password
    if (body.password !== '8250') {
      throw new UnauthorizedException('Invalid security code.');
    }

    const result = await this.mqttService.publishCommand(deviceId, body.command);
    
    await this.auditLogService.create(
      user.userId,
      `Command sent to device ${deviceId}: ${JSON.stringify(body.command)}`,
      'DEVICES',
      ip,
    );

    return { success: result };
  }

  @Get(':deviceId/snapshot')
  @ApiOperation({ summary: 'Get device raw register snapshot' })
  @ApiParam({ name: 'deviceId', description: 'Device ID string' })
  @ApiResponse({
    status: 200,
    description: 'Return the latest raw register snapshot.',
  })
  @ApiResponse({ status: 404, description: 'Snapshot not found.' })
  async getDeviceSnapshot(@Param('deviceId') deviceId: string) {
    return this.devicesService.getDeviceSnapshot(deviceId);
  }

  @Get(':deviceId/history-config')
  @ApiOperation({ summary: 'Get device history configuration' })
  @ApiParam({ name: 'deviceId', description: 'Device ID string' })
  async getDeviceHistoryConfig(@Param('deviceId') deviceId: string) {
    return this.devicesService.getDeviceHistoryConfig(deviceId);
  }

  @Put(':deviceId/history-config')
  @ApiOperation({ summary: 'Update device history configuration' })
  @ApiParam({ name: 'deviceId', description: 'Device ID string' })
  async updateDeviceHistoryConfig(
    @Param('deviceId') deviceId: string,
    @Body()
    body: {
      historyEnabled?: boolean;
      historyMode?: string;
      historyInterval?: string;
    },
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const result = await this.devicesService.updateDeviceHistoryConfig(
      deviceId,
      body,
    );

    this.mqttService.updateHistoryConfigCache(deviceId, {
      historyEnabled: result.historyEnabled,
      historyMode: result.historyMode,
      historyInterval: result.historyInterval,
    });

    await this.auditLogService.create(
      user.userId,
      `History config updated for device ${deviceId}: mode=${result.historyMode}, interval=${result.historyInterval}, enabled=${result.historyEnabled}`,
      'DEVICES',
      ip,
    );

    return result;
  }

  @Get(':deviceId/history')
  @ApiOperation({ summary: 'Get historical snapshots for a device' })
  @ApiParam({ name: 'deviceId', description: 'Device ID string' })
  async getDeviceHistory(
    @Param('deviceId') deviceId: string,
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.devicesService.getDeviceHistory(deviceId, {
      limit,
      startDate,
      endDate,
    });
  }

  @Get(':deviceId/dashboard')
  @ApiOperation({ summary: 'Get device dashboard data' })
  @ApiParam({ name: 'deviceId', description: 'Device ID string' })
  @ApiResponse({
    status: 200,
    description:
      'Return the live dashboard data for the device including online status.',
  })
  @ApiResponse({ status: 404, description: 'Device not found.' })
  async getDeviceDashboard(@Param('deviceId') deviceId: string) {
    return this.devicesService.getDeviceDashboard(deviceId);
  }
}
