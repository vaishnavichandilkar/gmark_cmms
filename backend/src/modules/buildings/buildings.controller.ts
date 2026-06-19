import { Controller, Get, Param, Post, Delete, Body, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BuildingsService } from './buildings.service';

@ApiTags('buildings')
@Controller('buildings')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) { }

  @Get()
  @ApiOperation({ summary: 'Get all buildings' })
  @ApiQuery({ name: 'societyId', required: false, description: 'Filter buildings by society ID' })
  @ApiResponse({
    status: 200,
    description: 'Return all buildings and their device count.',
  })
  async getBuildings(@Query('societyId') societyId?: string) {
    const parsedSocietyId = societyId ? parseInt(societyId, 10) : undefined;
    return this.buildingsService.findAll(parsedSocietyId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new building' })
  @ApiResponse({ status: 201, description: 'Building created successfully.' })
  async createBuilding(
    @Body() body: { name: string; info?: string; societyId: number },
  ) {
    return this.buildingsService.create(body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a building' })
  @ApiParam({ name: 'id', description: 'Building ID' })
  @ApiResponse({ status: 200, description: 'Building deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Building not found.' })
  async deleteBuilding(@Param('id', ParseIntPipe) id: number) {
    return this.buildingsService.remove(id);
  }

  @Get(':id/devices')
  @ApiOperation({ summary: 'Get all devices in a building' })
  @ApiParam({ name: 'id', description: 'Building ID' })
  @ApiResponse({
    status: 200,
    description: 'Return all devices belonging to the building.',
  })
  @ApiResponse({ status: 404, description: 'Building not found.' })
  async getDevicesByBuilding(@Param('id', ParseIntPipe) id: number) {
    return this.buildingsService.findDevicesByBuilding(id);
  }
}
