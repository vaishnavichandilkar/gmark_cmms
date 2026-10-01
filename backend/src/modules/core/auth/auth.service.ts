import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { validatePasswordStrength } from './utils/password.validator';

import {
  LoginDto,
  RegisterDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SignupDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (!validatePasswordStrength(dto.password)) {
      throw new BadRequestException(
        'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.',
      );
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existingUser) {
      throw new BadRequestException('Email or Username already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        mobileNumber: dto.mobileNumber,
        password: hashedPassword,
        role: dto.role || 'VIEWER',
        firstName: dto.firstName,
        lastName: dto.lastName,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        societyId: dto.societyId,
      },
    });

    // If building assignments are provided during registration
    if (dto.buildingIds && dto.buildingIds.length > 0) {
      await this.prisma.userBuilding.createMany({
        data: dto.buildingIds.map((buildingId) => ({
          userId: user.id,
          buildingId,
        })),
      });
    }

    return this.sanitizeUser(user);
  }

  async signup(dto: SignupDto) {
    if (!validatePasswordStrength(dto.password)) {
      throw new BadRequestException(
        'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.',
      );
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.workEmail }, { username: dto.workEmail }],
      },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const existingRegistration = await this.prisma.registration.findFirst({
      where: { gstNumber: dto.gstNumber },
    });

    if (existingRegistration) {
      throw new BadRequestException('GST number already registered. Please use a different GST number.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const [firstName, ...lastNameParts] = dto.fullName.split(' ');
    const lastName = lastNameParts.join(' ');



    const user = await this.prisma.user.create({
      data: {
        username: dto.workEmail, // using workEmail as username
        email: dto.workEmail,
        mobileNumber: dto.phoneNumber,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        firstName: firstName,
        lastName: lastName || null,
        isActive: true,
        city: dto.city,
        state: dto.state,
        country: dto.country || 'India',
        pincode: dto.zipCode,
      },
    });

    await this.prisma.registration.create({
      data: {
        companyName: dto.companyName || (dto.fullName + ' Organization'),
        gstNumber: dto.gstNumber,
        city: dto.city,
        state: dto.state,
        country: dto.country || 'India',
        zipCode: dto.zipCode,
        userId: user.id
      }
    });

    return this.sanitizeUser(user);
  }

  async login(dto: LoginDto, ipAddress: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.username },
          { email: dto.username }
        ]
      },
      include: {
        buildings: true,
        employee: true,
        mainFacility: true,
        facility: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const buildingIds = user.buildings.map((b) => b.buildingId);
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.societyId,
      user.mainFacilityId,
      buildingIds,
      user.facilityId,
      user.deviceId,
      user.deviceName,
    );
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    const sanitizedUser = this.sanitizeUser(user);
    sanitizedUser.permissions = await this.resolveUserPermissions(user);

    return {
      user: sanitizedUser,
      buildingIds,
      ...tokens,
    };
  }

  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { success: true };
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        buildings: {
          include: {
            building: true,
          },
        },
        employee: true,
        mainFacility: true,
        facility: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const sanitizedUser = this.sanitizeUser(user);
    sanitizedUser.permissions = await this.resolveUserPermissions(user);
    const buildingIds = user.buildings.map((b) => b.buildingId);

    return {
      user: sanitizedUser,
      buildingIds,
    };
  }

  async resolveUserPermissions(user: any): Promise<any[]> {
    const machineTabModules = [
      'machine_tab_general',
      'machine_tab_specification',
      'machine_tab_spares',
      'machine_tab_amc',
      'machine_tab_purchase',
      'machine_tab_documents',
      'machine_tab_iot',
    ];

    const facilityTabModules = [
      'facility_tab_general',
      'facility_tab_document',
    ];

    const allTabModules = [...machineTabModules, ...facilityTabModules];

    const modules = [
      'dashboard',
      'assets',
      'master_employee',
      'master_main_facility',
      'manage_access',
      'user_management',
      'facility_management',
      'machine_management',
      ...machineTabModules,
      ...facilityTabModules,
    ];

    // 1. Role-based baseline
    const role = user.role || 'VIEWER';
    const isSuperAdmin = role === 'SUPER_ADMIN';
    const isSocietyAdmin = role === 'SOCIETY_ADMIN';
    const isBuildingAdmin = role === 'BUILDING_ADMIN';
    const isOperator = role === 'OPERATOR';

    const baseline = modules.map((moduleId) => {
      if (isSuperAdmin || isSocietyAdmin) {
        return {
          moduleId,
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: isSuperAdmin || moduleId !== 'manage_access',
          canImport: !['manage_access', 'user_management', 'facility_management', 'machine_management', 'dashboard', 'assets', ...allTabModules].includes(moduleId),
          canExport: !allTabModules.includes(moduleId),
          canPrint: !allTabModules.includes(moduleId),
        };
      }

      if (isBuildingAdmin) {
        const allowed = ['dashboard', 'assets', 'facility_management', 'machine_management', ...allTabModules].includes(moduleId);
        return {
          moduleId,
          canView: allowed,
          canCreate: ['facility_management', 'machine_management', ...allTabModules].includes(moduleId),
          canEdit: ['facility_management', 'machine_management', ...allTabModules].includes(moduleId),
          canDelete: false,
          canImport: false,
          canExport: allowed && !allTabModules.includes(moduleId),
          canPrint: allowed && !allTabModules.includes(moduleId),
        };
      }

      if (isOperator) {
        const allowed = ['dashboard', 'assets', 'facility_management', 'machine_management', ...allTabModules].includes(moduleId);
        return {
          moduleId,
          canView: allowed,
          canCreate: false,
          canEdit: moduleId === 'machine_management' || moduleId === 'facility_management' || allTabModules.includes(moduleId),
          canDelete: false,
          canImport: false,
          canExport: allowed && !allTabModules.includes(moduleId),
          canPrint: allowed && !allTabModules.includes(moduleId),
        };
      }

      // Default VIEWER
      const allowed = ['dashboard', 'assets', 'facility_management', 'machine_management', ...allTabModules].includes(moduleId);
      return {
        moduleId,
        canView: allowed,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canImport: false,
        canExport: allowed && !allTabModules.includes(moduleId),
        canPrint: allowed && !allTabModules.includes(moduleId),
      };
    });

    let mergedPermissions = [...baseline];

    // 2. Overlay Designation permissions if user has employee designation
    if (user.employee?.designation) {
      const designationName = user.employee.designation.trim();
      const designation = await this.prisma.designation.findFirst({
        where: { name: { equals: designationName, mode: 'insensitive' } },
        include: { permissions: true },
      });

      if (designation && designation.permissions && designation.permissions.length > 0) {
        designation.permissions.forEach((dp) => {
          const index = mergedPermissions.findIndex((p) => p.moduleId === dp.moduleId);
          if (index >= 0) {
            mergedPermissions[index] = {
              ...mergedPermissions[index],
              canView: dp.canView,
              canCreate: dp.canCreate,
              canEdit: dp.canEdit,
              canDelete: dp.canDelete,
              canImport: dp.canImport ?? false,
              canExport: dp.canExport ?? false,
              canPrint: dp.canPrint ?? false,
            };
          } else {
            mergedPermissions.push({
              moduleId: dp.moduleId,
              canView: dp.canView,
              canCreate: dp.canCreate,
              canEdit: dp.canEdit,
              canDelete: dp.canDelete,
              canImport: dp.canImport ?? false,
              canExport: dp.canExport ?? false,
              canPrint: dp.canPrint ?? false,
            });
          }
        });

        // Inherit machine_management permission to tabs if not explicitly set in designation
        const mmPerm = designation.permissions.find((p) => p.moduleId === 'machine_management');
        if (mmPerm) {
          machineTabModules.forEach((tabMod) => {
            const hasExplicit = designation.permissions.some((p) => p.moduleId === tabMod);
            if (!hasExplicit) {
              const tIdx = mergedPermissions.findIndex((p) => p.moduleId === tabMod);
              if (tIdx >= 0) {
                mergedPermissions[tIdx] = {
                  ...mergedPermissions[tIdx],
                  canView: mmPerm.canView,
                  canCreate: mmPerm.canCreate,
                  canEdit: mmPerm.canEdit,
                  canDelete: mmPerm.canDelete,
                };
              }
            }
          });
        }

        // Inherit facility_management permission to tabs if not explicitly set in designation
        const fmPerm = designation.permissions.find((p) => p.moduleId === 'facility_management');
        if (fmPerm) {
          facilityTabModules.forEach((tabMod) => {
            const hasExplicit = designation.permissions.some((p) => p.moduleId === tabMod);
            if (!hasExplicit) {
              const tIdx = mergedPermissions.findIndex((p) => p.moduleId === tabMod);
              if (tIdx >= 0) {
                mergedPermissions[tIdx] = {
                  ...mergedPermissions[tIdx],
                  canView: fmPerm.canView,
                  canCreate: fmPerm.canCreate,
                  canEdit: fmPerm.canEdit,
                  canDelete: fmPerm.canDelete,
                };
              }
            }
          });
        }
      }
    }

    // 3. Overlay specific userPermission overrides
    const userPermissions = await this.prisma.userPermission.findMany({
      where: { userId: user.id },
    });

    userPermissions.forEach((up) => {
      const index = mergedPermissions.findIndex((p) => p.moduleId === up.moduleId);
      if (index >= 0) {
        mergedPermissions[index] = {
          ...mergedPermissions[index],
          canView: up.canView,
          canCreate: up.canCreate,
          canEdit: up.canEdit,
          canDelete: up.canDelete,
          canImport: up.canImport ?? false,
          canExport: up.canExport ?? false,
          canPrint: up.canPrint ?? false,
        };
      } else {
        mergedPermissions.push({
          moduleId: up.moduleId,
          canView: up.canView,
          canCreate: up.canCreate,
          canEdit: up.canEdit,
          canDelete: up.canDelete,
          canImport: up.canImport ?? false,
          canExport: up.canExport ?? false,
          canPrint: up.canPrint ?? false,
        });
      }
    });

    const mmUp = userPermissions.find((p) => p.moduleId === 'machine_management');
    if (mmUp) {
      machineTabModules.forEach((tabMod) => {
        const hasExplicit = userPermissions.some((p) => p.moduleId === tabMod);
        if (!hasExplicit) {
          const tIdx = mergedPermissions.findIndex((p) => p.moduleId === tabMod);
          if (tIdx >= 0) {
            mergedPermissions[tIdx] = {
              ...mergedPermissions[tIdx],
              canView: mmUp.canView,
              canCreate: mmUp.canCreate,
              canEdit: mmUp.canEdit,
              canDelete: mmUp.canDelete,
            };
          }
        }
      });
    }

    const fmUp = userPermissions.find((p) => p.moduleId === 'facility_management');
    if (fmUp) {
      facilityTabModules.forEach((tabMod) => {
        const hasExplicit = userPermissions.some((p) => p.moduleId === tabMod);
        if (!hasExplicit) {
          const tIdx = mergedPermissions.findIndex((p) => p.moduleId === tabMod);
          if (tIdx >= 0) {
            mergedPermissions[tIdx] = {
              ...mergedPermissions[tIdx],
              canView: fmUp.canView,
              canCreate: fmUp.canCreate,
              canEdit: fmUp.canEdit,
              canDelete: fmUp.canDelete,
            };
          }
        }
      });
    }

    return mergedPermissions;
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: 'HYPN_REFRESH_SECRET_KEY_2026', // Use proper env variables in production
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        include: { buildings: true, employee: true },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Access Denied');
      }

      const isRefreshTokenMatching = await bcrypt.compare(
        refreshToken,
        user.refreshToken,
      );
      if (!isRefreshTokenMatching) {
        throw new UnauthorizedException('Access Denied');
      }

      const buildingIds = user.buildings.map((b) => b.buildingId);
      const tokens = await this.generateTokens(
        user.id,
        user.email,
        user.role,
        user.societyId,
        user.mainFacilityId,
        buildingIds,
        user.facilityId,
        user.deviceId,
        user.deviceName,
      );
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      const sanitizedUser = this.sanitizeUser(user);
      sanitizedUser.permissions = await this.resolveUserPermissions(user);

      return {
        user: sanitizedUser,
        buildingIds,
        ...tokens,
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Incorrect current password');
    }

    if (!validatePasswordStrength(dto.newPassword)) {
      throw new BadRequestException(
        'New password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.',
      );
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return { success: true, message: 'Password updated successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      // In production, we might want to return success anyway to prevent user enumeration.
      // But for development/integration, let's throw an error or mock return.
      throw new NotFoundException('User with this email does not exist');
    }

    // Generate short-lived reset token (15 mins)
    const resetToken = this.jwtService.sign(
      { email: user.email, action: 'reset-password' },
      { secret: 'HYPN_RESET_SECRET_KEY_2026', expiresIn: '15m' },
    );

    // Mock send reset email -> log to console
    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;
    console.log(`\n========================================`);
    console.log(`[PASSWORD RESET REQUEST] User: ${user.email}`);
    console.log(`Reset Token: ${resetToken}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log(`========================================\n`);

    return {
      success: true,
      message: 'Password reset link generated and logged to console.',
      token: resetToken, // Returned for testing purposes
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    try {
      const payload = this.jwtService.verify(dto.token, {
        secret: 'HYPN_RESET_SECRET_KEY_2026',
      });

      if (payload.action !== 'reset-password') {
        throw new BadRequestException('Invalid reset token');
      }

      if (!validatePasswordStrength(dto.newPassword)) {
        throw new BadRequestException(
          'New password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.',
        );
      }

      const user = await this.prisma.user.findUnique({
        where: { email: payload.email },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedNewPassword,
          refreshToken: null, // Revoke active sessions on reset
        },
      });

      return { success: true, message: 'Password reset successfully' };
    } catch (e) {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  // --- Helpers ---
  private async generateTokens(
    userId: number,
    email: string,
    role: string,
    societyId: number | null,
    mainFacilityId: number | null,
    buildingIds: number[],
    facilityId: number | null = null,
    deviceId: string | null = null,
    deviceName: string | null = null,
  ) {
    const payload = {
      userId,
      email,
      role,
      societyId,
      mainFacilityId,
      facilityId,
      deviceId,
      deviceName,
      buildingIds,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: 'HYPN_ACCESS_SECRET_KEY_2026', // Use proper env in production
      expiresIn: '1h',
    });

    const refreshToken = this.jwtService.sign(
      { userId },
      {
        secret: 'HYPN_REFRESH_SECRET_KEY_2026',
        expiresIn: '7d',
      },
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  private async updateRefreshToken(userId: number, refreshToken: string) {
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedToken },
    });
  }

  private sanitizeUser(user: any) {
    const sanitized = { ...user };
    delete sanitized.password;
    delete sanitized.refreshToken;
    return sanitized;
  }
}
