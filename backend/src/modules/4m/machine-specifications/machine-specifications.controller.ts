import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { MachineSpecificationsService } from './machine-specifications.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { BuildingAccessGuard } from '../../core/auth/guards/building-access.guard';

@Controller('machines')
@UseGuards(JwtAuthGuard, RolesGuard, BuildingAccessGuard)
export class MachineSpecificationsController {
  constructor(private readonly machineSpecificationsService: MachineSpecificationsService) {}

  @Post(':id/specifications')
  create(
    @Param('id') id: string,
    @Body() data: { title: string; inputType: string; data: string; unit?: string }
  ) {
    return this.machineSpecificationsService.create(+id, data);
  }

  @Get(':id/specifications')
  findAll(@Param('id') id: string) {
    return this.machineSpecificationsService.findAll(+id);
  }

  @Delete(':id/specifications/:specId')
  remove(@Param('id') id: string, @Param('specId') specId: string) {
    return this.machineSpecificationsService.remove(+specId);
  }
}
