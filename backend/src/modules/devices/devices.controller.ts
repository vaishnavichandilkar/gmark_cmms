import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DevicesService } from './devices.service';

@ApiTags('devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get(':deviceId/dashboard')
  @ApiOperation({ summary: 'Get device dashboard data' })
  @ApiParam({ name: 'deviceId', description: 'Device ID string' })
  @ApiResponse({ status: 200, description: 'Return the live dashboard data for the device including online status.' })
  @ApiResponse({ status: 404, description: 'Device not found.' })
  async getDeviceDashboard(@Param('deviceId') deviceId: string) {
    return this.devicesService.getDeviceDashboard(deviceId);
  }
}
