import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FacilitiesService } from './facilities.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';

@ApiTags('facilities')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Post()
  create(@Body() createFacilityDto: any, @CurrentUser() currentUser: any) {
    return this.facilitiesService.create(createFacilityDto, currentUser);
  }

  @Get()
  findAll(@CurrentUser() currentUser: any) {
    return this.facilitiesService.findAll(currentUser);
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

  @Get(':id/users')
  getFacilityUsers(@Param('id', ParseIntPipe) id: number) {
    return this.facilitiesService.getFacilityUsers(id);
  }

  @Post(':id/users')
  assignFacilityUsers(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { userIds: number[] }
  ) {
    return this.facilitiesService.assignFacilityUsers(id, body?.userIds || []);
  }
}
