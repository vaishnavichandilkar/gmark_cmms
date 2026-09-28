import { Controller, Get, Post, Body, Query, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CheckpointsService } from './checkpoints.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';

@ApiTags('checkpoints')
@Controller('checkpoints')
export class CheckpointsController {
  constructor(private readonly checkpointsService: CheckpointsService) {}

  @Get('master')
  @ApiOperation({ summary: 'Get all Master Checkpoints from catalog' })
  async getMasterCheckpoints(
    @Query('search') search?: string,
    @Query('type') type?: string,
  ) {
    return this.checkpointsService.getMasterCheckpoints(search, type);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create Checkpoint with Dual Database Validation (Master + User DB)' })
  async createCheckpoint(@Body() body: any, @CurrentUser() user: any) {
    return this.checkpointsService.createCheckpointWithDualDatabase({
      ...body,
      userId: user?.userId,
    });
  }

  @Get('machine/:machineId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get checkpoints linked to a specific machine' })
  async getUserCheckpointsByMachine(@Param('machineId', ParseIntPipe) machineId: number) {
    return this.checkpointsService.getUserCheckpointsByMachine(machineId);
  }
}
