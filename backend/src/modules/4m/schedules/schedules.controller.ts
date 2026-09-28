import { Controller, Get, Post, Param, Query, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';

@ApiTags('schedules')
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @ApiOperation({ summary: 'Get maintenance schedules with multi-filter view (All, Predictive, Preventive, etc.)' })
  async getSchedules(
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('machineId') machineId?: number,
  ) {
    return this.schedulesService.getSchedules({ type, search, machineId });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new maintenance schedule with 7-tab configuration wizard' })
  async createSchedule(@Body() body: any, @CurrentUser() user: any) {
    return this.schedulesService.createSchedule(body, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get schedule details by ID' })
  async getScheduleById(@Param('id', ParseIntPipe) id: number) {
    return this.schedulesService.getScheduleById(id);
  }

  @Post(':id/trigger-wo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Trigger Work Order from Schedule & Dispatch Notifications' })
  async triggerWorkOrder(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.schedulesService.triggerScheduleWorkOrder(id, user);
  }
}
