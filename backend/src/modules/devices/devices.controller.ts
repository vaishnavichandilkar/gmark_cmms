import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DevicesService } from './devices.service';

@ApiTags('devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all devices' })
  @ApiResponse({ status: 200, description: 'Return all devices.' })
  async getAllDevices() {
    return this.devicesService.getAllDevices();
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
