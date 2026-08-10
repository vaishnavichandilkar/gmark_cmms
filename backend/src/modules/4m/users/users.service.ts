import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { validatePasswordStrength } from '../../core/auth/utils/password.validator';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async findAll(currentUser: any, societyId?: number) {
    let whereClause: any = {};

    if (currentUser.role === UserRole.SUPER_ADMIN) {
      if (societyId !== undefined) {
        whereClause.societyId = societyId;
      }
    } else if (currentUser.role === UserRole.SOCIETY_ADMIN) {
      whereClause.societyId = currentUser.societyId;
    } else {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.user.findMany({
      where: whereClause,
      include: {
        buildings: {
          include: {
            building: true,
          },
        },
        employee: true,
        mainFacility: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        buildings: {
          include: {
            building: true,
          },
        },
        employee: true,
        mainFacility: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.sanitizeUser(user);
  }

  async create(data: {
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
  }) {
    // Validate email uniqueness
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new BadRequestException(
        `User with email ${data.email} already exists`,
      );
    }

    // Validate username uniqueness
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: data.username },
    });
    if (existingUsername) {
      throw new BadRequestException(
        `User with username ${data.username} already exists`,
      );
    }

    const rawPassword = data.password || 'Welcome@123';
    // Validate password complexity
    if (!validatePasswordStrength(rawPassword)) {
      throw new BadRequestException(
        'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.',
      );
    }

    const hashedPassword = await this.hashPassword(rawPassword);

    const user = await this.prisma.user.create({
      data: {
        username: data.username,
        mobileNumber: data.mobileNumber,
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        profileTitle: data.profileTitle || null,
        profileDetail: data.profileDetail || null,
        profileImageUrl: data.profileImageUrl || null,
        floorNo: data.floorNo || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        pincode: data.pincode || null,
        role: data.role || UserRole.VIEWER,
        isActive: data.isActive !== undefined ? data.isActive : true,
        societyId: data.societyId,
        employeeId: data.employeeId,
        mainFacilityId: data.mainFacilityId,
      },
    });

    // Mock send invitation email -> log to console
    console.log(`\n========================================`);
    console.log(`[USER INVITATION EMAIL]`);
    console.log(`To: ${user.email}`);
    console.log(`Subject: Your Account Credentials`);
    console.log(`Body: Hello ${user.firstName || 'User'},`);
    console.log(`Your login account has been created.`);
    console.log(`Username: ${user.username}`);
    console.log(`Password: ${rawPassword}`);
    console.log(`========================================\n`);

    if (data.buildingIds && data.buildingIds.length > 0) {
      await this.prisma.userBuilding.createMany({
        data: data.buildingIds.map((buildingId) => ({
          userId: user.id,
          buildingId,
        })),
      });
    }

    return this.findOne(user.id);
  }

  async update(
    id: number,
    data: {
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
  ) {
    const existingUser = await this.findOne(id);

    const updateData: any = { ...data };
    delete updateData.buildingIds;

    if (data.email && data.email !== existingUser.email) {
      const existing = await this.prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: { id },
        },
      });
      if (existing) {
        throw new BadRequestException(
          `User with email ${data.email} already exists`,
        );
      }
    }

    if (data.username && data.username !== existingUser.username) {
      const existing = await this.prisma.user.findFirst({
        where: {
          username: data.username,
          NOT: { id },
        },
      });
      if (existing) {
        throw new BadRequestException(
          `User with username ${data.username} already exists`,
        );
      }
    }

    if (data.password) {
      if (!validatePasswordStrength(data.password)) {
        throw new BadRequestException(
          'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.',
        );
      }
      updateData.password = await this.hashPassword(data.password);
    }

    await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    if (data.buildingIds !== undefined) {
      // Delete old associations
      await this.prisma.userBuilding.deleteMany({
        where: { userId: id },
      });
      // Add new associations
      if (data.buildingIds.length > 0) {
        await this.prisma.userBuilding.createMany({
          data: data.buildingIds.map((buildingId) => ({
            userId: id,
            buildingId,
          })),
        });
      }
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    await this.prisma.user.delete({
      where: { id },
    });
    return user;
  }

  async getUserPermissions(id: number) {
    // Verify user exists
    await this.findOne(id);
    
    return this.prisma.userPermission.findMany({
      where: { userId: id }
    });
  }

  async updateUserPermissions(id: number, permissions: any[]) {
    // Verify user exists
    await this.findOne(id);

    // Run in a transaction: delete old specific permissions and insert new ones
    return this.prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({
        where: { userId: id }
      });

      if (permissions && permissions.length > 0) {
        await tx.userPermission.createMany({
          data: permissions.map(p => ({
            userId: id,
            moduleId: p.moduleId,
            canView: p.canView || false,
            canCreate: p.canCreate || false,
            canEdit: p.canEdit || false,
            canDelete: p.canDelete || false,
            canImport: p.canImport || false,
            canExport: p.canExport || false,
            canPrint: p.canPrint || false,
          }))
        });
      }

      return tx.userPermission.findMany({
        where: { userId: id }
      });
    });
  }

  private sanitizeUser(user: any) {
    const sanitized = { ...user };
    delete sanitized.password;
    delete sanitized.refreshToken;
    return sanitized;
  }
}
