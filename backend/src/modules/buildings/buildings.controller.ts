import {
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BuildingsService } from './buildings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BuildingAccessGuard } from '../auth/guards/building-access.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';

@ApiTags('buildings')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard, BuildingAccessGuard)
@Controller('buildings')
export class BuildingsController {
  constructor(
    private readonly buildingsService: BuildingsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all buildings' })
  @ApiQuery({
    name: 'societyId',
    required: false,
    description: 'Filter buildings by society ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Return all buildings and their device count.',
  })
  async getBuildings(
    @CurrentUser() user: any,
    @Query('societyId') societyId?: string,
  ) {
    const parsedSocietyId = societyId ? parseInt(societyId, 10) : undefined;
    return this.buildingsService.findAll(user, parsedSocietyId);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SOCIETY_ADMIN)
  @ApiOperation({ summary: 'Create a new building' })
  @ApiResponse({ status: 201, description: 'Building created successfully.' })
  async createBuilding(
    @Body() body: { name: string; info?: string; societyId: number },
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const result = await this.buildingsService.create(body);
    await this.auditLogService.create(
      user.userId,
      `Building Created: ${result.name} (ID: ${result.id})`,
      'BUILDINGS',
      ip,
    );
    return result;
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SOCIETY_ADMIN)
  @ApiOperation({ summary: 'Update an existing building' })
  @ApiParam({ name: 'id', description: 'Building ID' })
  @ApiResponse({ status: 200, description: 'Building updated successfully.' })
  @ApiResponse({ status: 404, description: 'Building not found.' })
  async updateBuilding(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; info?: string; societyId?: number },
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const result = await this.buildingsService.update(id, body);
    await this.auditLogService.create(
      user.userId,
      `Building Updated: ${result.name} (ID: ${result.id})`,
      'BUILDINGS',
      ip,
    );
    return result;
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SOCIETY_ADMIN)
  @ApiOperation({ summary: 'Delete a building' })
  @ApiParam({ name: 'id', description: 'Building ID' })
  @ApiResponse({ status: 200, description: 'Building deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Building not found.' })
  async deleteBuilding(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const result = await this.buildingsService.remove(id);
    await this.auditLogService.create(
      user.userId,
      `Building Deleted: ID ${id}`,
      'BUILDINGS',
      ip,
    );
    return result;
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
