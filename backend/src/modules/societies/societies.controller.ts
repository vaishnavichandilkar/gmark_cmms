import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SocietiesService } from './societies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';

@ApiTags('societies')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('societies')
export class SocietiesController {
  constructor(
    private readonly societiesService: SocietiesService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all societies' })
  @ApiResponse({ status: 200, description: 'Return all societies.' })
  async getSocieties(@CurrentUser() user: any) {
    return this.societiesService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get society by ID' })
  @ApiParam({ name: 'id', description: 'Society ID' })
  @ApiResponse({ status: 200, description: 'Return society details.' })
  @ApiResponse({ status: 404, description: 'Society not found.' })
  async getSocietyById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.societiesService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new society' })
  @ApiResponse({ status: 201, description: 'Society created successfully.' })
  async createSociety(
    @Body() body: { name: string; city: string },
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const result = await this.societiesService.create(body);
    await this.auditLogService.create(
      user.userId,
      `Society Created: ${result.name} (ID: ${result.id})`,
      'SOCIETIES',
      ip,
    );
    return result;
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update an existing society' })
  @ApiParam({ name: 'id', description: 'Society ID' })
  @ApiResponse({ status: 200, description: 'Society updated successfully.' })
  @ApiResponse({ status: 404, description: 'Society not found.' })
  async updateSociety(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name: string; city: string },
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const result = await this.societiesService.update(id, body);
    await this.auditLogService.create(
      user.userId,
      `Society Updated: ${result.name} (ID: ${result.id})`,
      'SOCIETIES',
      ip,
    );
    return result;
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a society' })
  @ApiParam({ name: 'id', description: 'Society ID' })
  @ApiResponse({ status: 200, description: 'Society deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Society not found.' })
  async deleteSociety(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const result = await this.societiesService.remove(id);
    await this.auditLogService.create(
      user.userId,
      `Society Deleted: ID ${id}`,
      'SOCIETIES',
      ip,
    );
    return result;
  }
}
