import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  ForbiddenException,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SOCIETY_ADMIN)
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Return all users.' })
  async findAll(
    @CurrentUser() user: any,
    @Query('societyId') societyId?: string,
  ) {
    const parsedId = societyId ? parseInt(societyId, 10) : undefined;
    return this.usersService.findAll(user, parsedId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Return user details.' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
  ) {
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.role !== UserRole.SOCIETY_ADMIN &&
      currentUser.userId !== id
    ) {
      throw new ForbiddenException('Access denied');
    }
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SOCIETY_ADMIN)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully.' })
  async create(
    @Body()
    body: {
      username: string;
      mobileNumber?: string;
      email: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      profileTitle?: string;
      profileDetail?: string;
      profileImageUrl?: string;
      floorNo?: string;
      city?: string;
      state?: string;
      country?: string;
      pincode?: string;
      role?: UserRole;
      isActive?: boolean;
      societyId?: number;
      employeeId?: number;
      mainFacilityId?: number;
      buildingIds?: number[];
    },
    @CurrentUser() currentUser: any,
    @Ip() ip: string,
  ) {
    const result = await this.usersService.create(body);
    await this.auditLogService.create(
      currentUser.userId,
      `User Created: ${result.username} (${result.email})`,
      'USERS',
      ip,
    );
    return result;
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SOCIETY_ADMIN)
  @ApiOperation({ summary: 'Update an existing user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      username?: string;
      mobileNumber?: string;
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      profileTitle?: string;
      profileDetail?: string;
      profileImageUrl?: string;
      floorNo?: string;
      city?: string;
      state?: string;
      country?: string;
      pincode?: string;
      role?: UserRole;
      isActive?: boolean;
      buildingIds?: number[];
      societyId?: number;
      employeeId?: number;
      mainFacilityId?: number;
    },
    @CurrentUser() currentUser: any,
    @Ip() ip: string,
  ) {
    const result = await this.usersService.update(id, body);
    await this.auditLogService.create(
      currentUser.userId,
      `User Updated: ID ${id}`,
      'USERS',
      ip,
    );
    return result;
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SOCIETY_ADMIN)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully.' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
    @Ip() ip: string,
  ) {
    const result = await this.usersService.remove(id);
    await this.auditLogService.create(
      currentUser.userId,
      `User Deleted: ID ${id}`,
      'USERS',
      ip,
    );
    return result;
  }

  @Get(':id/permissions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SOCIETY_ADMIN)
  @ApiOperation({ summary: 'Get specific permissions for a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async getUserPermissions(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.getUserPermissions(id);
  }

  @Put(':id/permissions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SOCIETY_ADMIN)
  @ApiOperation({ summary: 'Update specific permissions for a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async updateUserPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() permissions: any[],
    @CurrentUser() currentUser: any,
    @Ip() ip: string,
  ) {
    const result = await this.usersService.updateUserPermissions(id, permissions);
    await this.auditLogService.create(
      currentUser.userId,
      `User Permissions Updated: ID ${id}`,
      'USERS',
      ip,
    );
    return result;
  }
}
