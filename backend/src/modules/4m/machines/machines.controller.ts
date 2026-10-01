import {
  Controller,
  Get,
  Param,
  Post,
  Put,
  Patch,
  Delete,
  Body,
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
import { MachinesService } from './machines.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { BuildingAccessGuard } from '../../core/auth/guards/building-access.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { AuditLogService } from '../../core/audit-log/audit-log.service';

@ApiTags('machines')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard, BuildingAccessGuard)
@Controller('machines')
export class MachinesController {
  constructor(
    private readonly machinesService: MachinesService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all machines' })
  @ApiResponse({ status: 200, description: 'Return all machines.' })
  async getAllMachines(@CurrentUser() user: any) {
    return this.machinesService.getAllMachines(user);
  }

  @Get('next-machine-code')
  @ApiOperation({ summary: 'Get next auto-generated machine code' })
  @ApiResponse({ status: 200, description: 'Return the next machine code preview.' })
  async getNextMachineCode() {
    return this.machinesService.getNextMachineCode();
  }

  @Get('next-asset-code')
  @ApiOperation({ summary: 'Get next auto-generated asset code' })
  @ApiResponse({ status: 200, description: 'Return the next asset code preview.' })
  async getNextAssetCode() {
    return this.machinesService.getNextAssetCode();
  }

  @Get('next-codes')
  @ApiOperation({ summary: 'Get next machine code and asset code previews' })
  @ApiResponse({ status: 200, description: 'Return the next machine and asset code previews.' })
  async getNextCodes() {
    return this.machinesService.getNextCodes();
  }

  @Get('next-code')
  @ApiOperation({ summary: 'Alias to get next auto-generated machine and asset codes' })
  @ApiResponse({ status: 200, description: 'Return the next codes preview.' })
  async getNextCode() {
    return this.machinesService.getNextCodes();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific machine by ID' })
  @ApiParam({ name: 'id', description: 'Machine ID' })
  @ApiResponse({ status: 200, description: 'Return the machine.' })
  @ApiResponse({ status: 404, description: 'Machine not found.' })
  async getMachineById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.machinesService.getMachineById(id, user);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SOCIETY_ADMIN)
  @ApiOperation({ summary: 'Create a new machine' })
  @ApiResponse({ status: 201, description: 'Machine created successfully.' })
  async createMachine(
    @Body() body: any,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const result = await this.machinesService.create(body);
    await this.auditLogService.create(
      user.userId,
      `Machine Created: ${result.name} (ID: ${result.id})`,
      'MACHINES',
      ip,
    );
    return result;
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SOCIETY_ADMIN)
  @ApiOperation({ summary: 'Update an existing machine' })
  @ApiParam({ name: 'id', description: 'Machine ID' })
  @ApiResponse({ status: 200, description: 'Machine updated successfully.' })
  @ApiResponse({ status: 404, description: 'Machine not found.' })
  async updateMachine(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const result = await this.machinesService.update(id, body);
    await this.auditLogService.create(
      user.userId,
      `Machine Updated: ${result.name} (ID: ${result.id})`,
      'MACHINES',
      ip,
    );
    return result;
  }

  @Patch(':id/move')
  @Put(':id/move')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SOCIETY_ADMIN, UserRole.BUILDING_ADMIN)
  @ApiOperation({ summary: 'Move machine to another facility, building, or parent machine' })
  @ApiParam({ name: 'id', description: 'Machine ID' })
  @ApiResponse({ status: 200, description: 'Machine moved successfully.' })
  async moveMachine(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { targetType: 'facility' | 'building' | 'machine' | 'device'; targetId: number },
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const result = await this.machinesService.moveMachine(id, body);
    await this.auditLogService.create(
      user.userId,
      `Machine Moved: ${result.name} (ID: ${result.id}) to ${body.targetType} ${body.targetId}`,
      'MACHINES',
      ip,
    );
    return result;
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SOCIETY_ADMIN)
  @ApiOperation({ summary: 'Delete a machine' })
  @ApiParam({ name: 'id', description: 'Machine ID' })
  @ApiResponse({ status: 200, description: 'Machine deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Machine not found.' })
  async deleteMachine(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const result = await this.machinesService.remove(id);
    await this.auditLogService.create(
      user.userId,
      `Machine Deleted: ID ${id}`,
      'MACHINES',
      ip,
    );
    return result;
  }

  @Post(':id/specifications')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SOCIETY_ADMIN)
  @ApiOperation({ summary: 'Add a specification to a machine' })
  async addSpecification(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { title: string; inputType: string; data: string; unit?: string }
  ) {
    return this.machinesService.addSpecification(id, body);
  }

  @Post(':id/documents')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SOCIETY_ADMIN)
  @ApiOperation({ summary: 'Add a document/file to a machine' })
  async addDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any // using any for multer/file upload logic
  ) {
    return this.machinesService.addDocument(id, body);
  }
}
