import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { MainFacilitiesService } from './main-facilities.service';
import { CreateMainFacilityDto } from './dto/create-main-facility.dto';
import { UpdateMainFacilityDto } from './dto/update-main-facility.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('main-facilities')
export class MainFacilitiesController {
  constructor(private readonly mainFacilitiesService: MainFacilitiesService) {}

  @Post()
  create(@Body() createDto: CreateMainFacilityDto, @CurrentUser() currentUser: any) {
    return this.mainFacilitiesService.create(createDto, currentUser);
  }

  @Get('next-code')
  getNextFacilityCode() {
    return this.mainFacilitiesService.getNextFacilityCode();
  }

  @Get()
  findAll(@CurrentUser() currentUser: any) {
    return this.mainFacilitiesService.findAll(currentUser);
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
