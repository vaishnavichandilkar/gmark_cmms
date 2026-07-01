import { Controller, Get, Param, Post, Put, Delete, Body, ParseIntPipe, UseGuards, Ip } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BuildingAccessGuard } from '../auth/guards/building-access.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';

@ApiTags('devices')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard, BuildingAccessGuard)
@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly auditLogService: AuditLogService,
  ) { }

  @Get()
  @ApiOperation({ summary: 'Get all devices' })
  @ApiResponse({ status: 200, description: 'Return all devices.' })
  async getAllDevices(@CurrentUser() user: any) {
    return this.devicesService.getAllDevices(user);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SOCIETY_ADMIN)
  @ApiOperation({ summary: 'Create a new device' })
  @ApiResponse({ status: 201, description: 'Device created successfully.' })
  async createDevice(
    @Body() body: {
      name: string;
      deviceId: string;
      buildingId: number;
      application?: string;
      pumpType?: string;
      controller?: string;
      macType?: string;
    },
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const result = await this.devicesService.create(body);
    await this.auditLogService.create(user.userId, `Device Created: ${result.name} (ID: ${result.id}, Device ID: ${result.deviceId})`, 'DEVICES', ip);
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
    @Body() body: {
      name: string;
      deviceId: string;
      application?: string;
      pumpType?: string;
      controller?: string;
      macType?: string;
    },
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const result = await this.devicesService.update(id, body);
    await this.auditLogService.create(user.userId, `Device Updated: ${result.name} (ID: ${result.id}, Device ID: ${result.deviceId})`, 'DEVICES', ip);
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
    await this.auditLogService.create(user.userId, `Device Deleted: ID ${id}`, 'DEVICES', ip);
    return result;
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
