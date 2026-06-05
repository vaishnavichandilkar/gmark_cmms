import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BuildingsService } from './buildings.service';

@ApiTags('buildings')
@Controller('buildings')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all buildings' })
  @ApiResponse({ status: 200, description: 'Return all buildings and their device count.' })
  async getBuildings() {
    return this.buildingsService.findAll();
  }

  @Get(':id/devices')
  @ApiOperation({ summary: 'Get all devices in a building' })
  @ApiParam({ name: 'id', description: 'Building ID' })
  @ApiResponse({ status: 200, description: 'Return all devices belonging to the building.' })
  @ApiResponse({ status: 404, description: 'Building not found.' })
  async getDevicesByBuilding(@Param('id', ParseIntPipe) id: number) {
    return this.buildingsService.findDevicesByBuilding(id);
  }
}
