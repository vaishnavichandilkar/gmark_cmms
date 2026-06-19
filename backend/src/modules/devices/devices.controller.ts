import { Controller, Get, Param, Post, Put, Delete, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DevicesService } from './devices.service';

@ApiTags('devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) { }

  @Get()
  @ApiOperation({ summary: 'Get all devices' })
  @ApiResponse({ status: 200, description: 'Return all devices.' })
  async getAllDevices() {
    return this.devicesService.getAllDevices();
  }

  @Post()
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
  ) {
    return this.devicesService.create(body);
  }

  @Put(':id')
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
  ) {
    return this.devicesService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a device' })
  @ApiParam({ name: 'id', description: 'Device ID' })
  @ApiResponse({ status: 200, description: 'Device deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Device not found.' })
  async deleteDevice(@Param('id', ParseIntPipe) id: number) {
    return this.devicesService.remove(id);
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
