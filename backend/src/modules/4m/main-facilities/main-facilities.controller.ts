import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { MainFacilitiesService } from './main-facilities.service';
import { CreateMainFacilityDto } from './dto/create-main-facility.dto';
import { UpdateMainFacilityDto } from './dto/update-main-facility.dto';

@Controller('main-facilities')
export class MainFacilitiesController {
  constructor(private readonly mainFacilitiesService: MainFacilitiesService) {}

  @Post()
  create(@Body() createDto: CreateMainFacilityDto) {
    return this.mainFacilitiesService.create(createDto);
  }

  @Get('next-code')
  getNextFacilityCode() {
    return this.mainFacilitiesService.getNextFacilityCode();
  }

  @Get()
  findAll() {
    return this.mainFacilitiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mainFacilitiesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateMainFacilityDto) {
    return this.mainFacilitiesService.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mainFacilitiesService.remove(+id);
  }
}
