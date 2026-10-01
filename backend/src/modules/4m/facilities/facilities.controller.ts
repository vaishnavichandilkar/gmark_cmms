import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Put } from '@nestjs/common';
import { FacilitiesService } from './facilities.service';

@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Post()
  create(@Body() createFacilityDto: any) {
    return this.facilitiesService.create(createFacilityDto);
  }

  @Get()
  findAll() {
    return this.facilitiesService.findAll();
  }
  @Get('next-code')
  getNextFacilityCode() {
    return this.facilitiesService.getNextFacilityCode();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.facilitiesService.findOne(id);
  }

  @Put(':id')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateFacilityDto: any) {
    return this.facilitiesService.update(id, updateFacilityDto);
  }

  @Patch(':id/move')
  @Put(':id/move')
  moveFacility(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { targetType: 'mainFacility' | 'facility'; targetId: number }
  ) {
    return this.facilitiesService.moveFacility(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.facilitiesService.remove(id);
  }
}
