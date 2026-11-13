import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { validatePasswordStrength } from './utils/password.validator';
import { validateGSTIN } from '../../../common/validators/is-gstin.validator';

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
  ) { }

  async checkGstAvailability(gstNumber: string) {
    const cleaned = (gstNumber || '').trim().toUpperCase();
    if (!cleaned) {
      return { available: false, message: 'GST number is required' };
    }
    const existing = await this.prisma.registration.findFirst({
      where: { gstNumber: cleaned }
    });
    return {
      available: !existing,
      gstNumber: cleaned,
      message: existing ? 'This GST number is already registered.' : 'GST number is available.'
    };
  }

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
        plainPassword: dto.password,
        role: dto.role || 'VIEWER',
        moduleAccess: dto.moduleAccess || 'BOTH',
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
    // Extract company fields
    const companyName = (dto.company?.companyName || dto.companyName || '').trim();
    const businessCategory = (dto.company?.businessCategory || dto.businessCategory || '').trim();
    const gstNumber = (dto.company?.gstNumber || dto.gstNumber || '').trim().toUpperCase();
    const address = (dto.company?.address || dto.address || '').trim();
    const postalCode = (dto.company?.postalCode || dto.postalCode || dto.company?.zipCode || dto.zipCode || '').trim();
    const city = (dto.company?.city || dto.city || '').trim();
    const state = (dto.company?.state || dto.state || '').trim();
    const country = (dto.company?.country || dto.country || 'India').trim();

    // Extract personal fields
    const fullName = (dto.personal?.fullName || dto.fullName || '').trim();
    const designation = (dto.personal?.designation || dto.designation || '').trim();
    const email = (dto.personal?.email || dto.email || dto.workEmail || '').trim().toLowerCase();
    const phoneNumber = (dto.personal?.phoneNumber || dto.phoneNumber || '').trim();

    const password = dto.password;
    const termsAccepted = dto.termsAccepted !== undefined ? dto.termsAccepted : true;

    // 1. Mandatory Field Validations with exact error messages
    if (!companyName) {
      throw new BadRequestException('Please enter company name.');
    }
    if (!businessCategory) {
      throw new BadRequestException('Please select business category.');
    }
    if (!gstNumber) {
      throw new BadRequestException('Please enter a valid GST number.');
    }

    if (!address) {
      throw new BadRequestException('Please enter complete company address.');
    }
    if (!postalCode) {
      throw new BadRequestException('Please enter a valid postal code.');
    }

    if (country.toLowerCase() === 'india' && !/^\d{6}$/.test(postalCode)) {
      throw new BadRequestException('Please enter a valid postal code.');
    }

    if (!city) {
      throw new BadRequestException('Please enter city.');
    }
    if (!state) {
      throw new BadRequestException('Please enter state.');
    }
    if (!country) {
      throw new BadRequestException('Please select country.');
    }

    if (!fullName) {
      throw new BadRequestException('Please enter your full name.');
    }
    if (!designation) {
      throw new BadRequestException('Please enter your designation.');
    }
    if (!email) {
      throw new BadRequestException('Please enter a valid email address.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Please enter a valid email address.');
    }

    if (!phoneNumber) {
      throw new BadRequestException('Please enter a valid phone number.');
    }

    if (!password) {
      throw new BadRequestException('Password is required.');
    }

    if (!validatePasswordStrength(password)) {
      throw new BadRequestException(
        'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.',
      );
    }

    if (termsAccepted === false) {
      throw new BadRequestException('Please accept Terms & Conditions.');
    }

    // 2. Database level duplicate checks
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username: email }],
      },
    });

    if (existingUser) {
      throw new BadRequestException('This email is already registered.');
    }

    const existingRegistration = await this.prisma.registration.findFirst({
      where: { gstNumber },
    });

    if (existingRegistration) {
      throw new BadRequestException('This GST number is already registered.');
    }

    // 3. Database persistence with transaction
    const hashedPassword = await bcrypt.hash(password, 10);
    const [firstName, ...lastNameParts] = fullName.split(' ');
    const lastName = lastNameParts.join(' ') || null;

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: email,
          email: email,
          mobileNumber: phoneNumber,
          password: hashedPassword,
          plainPassword: password,
          role: 'SUPER_ADMIN',
          moduleAccess: dto.moduleAccess || 'BOTH',
          firstName,
          lastName,
          fullName,
          designation,
          isActive: true,
          city,
          state,
          country,
          pincode: postalCode,
        },
      });

      // Create Employee record for root admin
      const employee = await tx.employee.create({
        data: {
          employeeCode: null,
          fullName: fullName,
          mobileNumber: phoneNumber,
          officialEmail: email,
          personalEmail: email,
          dateOfJoining: null,
          dateOfBirth: null,
          department: null,
          designation: designation || 'Admin',
          reportingTo: null,
          adminId: user.id,
        },
      });

      // Self-reference adminId and link employeeId for root admin
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          adminId: user.id,
          employeeId: employee.id,
        },
      });

      const registration = await tx.registration.create({
        data: {
          companyName,
          businessCategory,
          gstNumber,
          address,
          city,
          state,
          country,
          postalCode,
          zipCode: postalCode,
          userId: user.id,
        },
      });

      return { user: updatedUser, registration };
    });

    const tokens = await this.generateTokens(
      result.user.id,
      result.user.email,
      result.user.role,
      result.user.societyId,
      result.user.mainFacilityId,
      [],
      result.user.facilityId,
      result.user.deviceId,
      result.user.deviceName,
    );
    await this.updateRefreshToken(result.user.id, tokens.refreshToken);

    const sanitizedUser = this.sanitizeUser(result.user);
    sanitizedUser.permissions = await this.resolveUserPermissions(result.user);

    return {
      user: sanitizedUser,
      buildingIds: [],
      ...tokens,
    };
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

    let isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid && user.plainPassword && dto.password === user.plainPassword) {
      isPasswordValid = true;
      const newHashed = await bcrypt.hash(dto.password, 10);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: newHashed },
      });
    }
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Record last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

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
      user.tokenVersion || 1,
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
      'machine_tab_wo',
      'machine_tab_checklist',
      'machine_tab_schedule_maintenance',
    ];

    const facilityTabModules = [
      'facility_tab_general',
      'facility_tab_document',
    ];

    const spareTabModules = [
      'spare_tab_general',
      'spare_tab_stock',
      'spare_tab_machines_list',
      'spare_tab_specification',
      'spare_tab_warranties',
      'spare_tab_suppliers',
      'spare_tab_documents',
      'spare_tab_log',
    ];

    const supplierTabModules = [
      'supplier_tab_general',
      'supplier_tab_location',
      'supplier_tab_spares',
      'supplier_tab_documents',
      'supplier_tab_log',
    ];

    const scheduleTabModules = [
      'schedule_tab_general',
      'schedule_tab_scheduling',
      'schedule_tab_checkpoints',
      'schedule_tab_spares',
      'schedule_tab_notifications',
      'schedule_tab_notes',
      'schedule_tab_files',
      'schedule_tab_logs',
    ];

    const allTabModules = [...machineTabModules, ...facilityTabModules, ...spareTabModules, ...supplierTabModules, ...scheduleTabModules];

    const modules = [
      'dashboard',
      'assets',
      'master_employee',
      'master_main_facility',
      'manage_access',
      'user_management',
      'facility_management',
      'machine_management',
      'spares',
      'suppliers',
      'work_orders',
      'schedules',
      ...machineTabModules,
      ...facilityTabModules,
      ...spareTabModules,
      ...supplierTabModules,
      ...scheduleTabModules,
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
        const allowed = ['dashboard', 'assets', 'facility_management', 'machine_management', 'spares', 'suppliers', 'work_orders', 'schedules', ...allTabModules].includes(moduleId);
        return {
          moduleId,
          canView: allowed,
          canCreate: ['facility_management', 'machine_management', 'spares', 'suppliers', 'work_orders', 'schedules', ...allTabModules].includes(moduleId),
          canEdit: ['facility_management', 'machine_management', 'spares', 'suppliers', 'work_orders', 'schedules', ...allTabModules].includes(moduleId),
          canDelete: false,
          canImport: false,
          canExport: allowed && !allTabModules.includes(moduleId),
          canPrint: allowed && !allTabModules.includes(moduleId),
        };
      }

      if (isOperator) {
        const allowed = ['dashboard', 'assets', 'facility_management', 'machine_management', 'spares', 'suppliers', 'work_orders', 'schedules', ...allTabModules].includes(moduleId);
        return {
          moduleId,
          canView: allowed,
          canCreate: ['work_orders', 'schedules'].includes(moduleId),
          canEdit: moduleId === 'machine_management' || moduleId === 'facility_management' || moduleId === 'work_orders' || moduleId === 'schedules' || allTabModules.includes(moduleId),
          canDelete: false,
          canImport: false,
          canExport: allowed && !allTabModules.includes(moduleId),
          canPrint: allowed && !allTabModules.includes(moduleId),
        };
      }

      // Default VIEWER
      const allowed = ['dashboard', 'assets', 'facility_management', 'machine_management', 'spares', 'suppliers', 'work_orders', 'schedules', ...allTabModules].includes(moduleId);
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

    // 2. Overlay Designation permissions if user has designation or employee designation
    const userDesignationName = user.designation || user.employee?.designation;
    if (userDesignationName) {
      const designationName = userDesignationName.trim();
      const effectiveAdminId = user.adminId || user.id;
      const designation = await this.prisma.designation.findFirst({
        where: {
          name: { equals: designationName, mode: 'insensitive' },
          ...(effectiveAdminId ? { adminId: effectiveAdminId } : {}),
        },
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

        // Inherit spares permission to tabs if not explicitly set in designation
        const sparesPerm = designation.permissions.find((p) => p.moduleId === 'spares');
        if (sparesPerm) {
          spareTabModules.forEach((tabMod) => {
            const hasExplicit = designation.permissions.some((p) => p.moduleId === tabMod);
            if (!hasExplicit) {
              const tIdx = mergedPermissions.findIndex((p) => p.moduleId === tabMod);
              if (tIdx >= 0) {
                mergedPermissions[tIdx] = {
                  ...mergedPermissions[tIdx],
                  canView: sparesPerm.canView,
                  canCreate: sparesPerm.canCreate,
                  canEdit: sparesPerm.canEdit,
                  canDelete: sparesPerm.canDelete,
                };
              }
            }
          });
        }

        // Inherit suppliers permission to tabs if not explicitly set in designation
        const suppliersPerm = designation.permissions.find((p) => p.moduleId === 'suppliers');
        if (suppliersPerm) {
          supplierTabModules.forEach((tabMod) => {
            const hasExplicit = designation.permissions.some((p) => p.moduleId === tabMod);
            if (!hasExplicit) {
              const tIdx = mergedPermissions.findIndex((p) => p.moduleId === tabMod);
              if (tIdx >= 0) {
                mergedPermissions[tIdx] = {
                  ...mergedPermissions[tIdx],
                  canView: suppliersPerm.canView,
                  canCreate: suppliersPerm.canCreate,
                  canEdit: suppliersPerm.canEdit,
                  canDelete: suppliersPerm.canDelete,
                };
              }
            }
          });
        }

        // Inherit schedules permission to tabs if not explicitly set in designation
        const schedulesPerm = designation.permissions.find((p) => p.moduleId === 'schedules');
        if (schedulesPerm) {
          scheduleTabModules.forEach((tabMod) => {
            const hasExplicit = designation.permissions.some((p) => p.moduleId === tabMod);
            if (!hasExplicit) {
              const tIdx = mergedPermissions.findIndex((p) => p.moduleId === tabMod);
              if (tIdx >= 0) {
                mergedPermissions[tIdx] = {
                  ...mergedPermissions[tIdx],
                  canView: schedulesPerm.canView,
                  canCreate: schedulesPerm.canCreate,
                  canEdit: schedulesPerm.canEdit,
                  canDelete: schedulesPerm.canDelete,
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

    // If the user has view access to ANY individual asset (asset_mac_*, asset_fac_*, asset_mf_*),
    // automatically enable canView on the root 'assets' module so they can access the asset hierarchy
    const hasAnyAssetPerm = mergedPermissions.some(
      (p) => p.moduleId?.startsWith('asset_') && p.canView
    );
    if (hasAnyAssetPerm) {
      const assetsIdx = mergedPermissions.findIndex((p) => p.moduleId === 'assets');
      if (assetsIdx >= 0) {
        mergedPermissions[assetsIdx].canView = true;
      } else {
        mergedPermissions.push({
          moduleId: 'assets',
          canView: true,
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canImport: false,
          canExport: false,
          canPrint: false,
        });
      }
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
        user.tokenVersion || 1,
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

    const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'SOCIETY_ADMIN' || (user.designation && user.designation.toLowerCase().includes('admin'));
    if (!isAdmin) {
      throw new ForbiddenException('Only administrators can change passwords.');
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
    tokenVersion: number = 1,
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
      tokenVersion,
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

  async updateModuleAccess(userId: number, moduleAccess: string) {
    const valid = ['CMMS', 'IOT', 'BOTH'];
    if (!valid.includes(moduleAccess)) {
      throw new BadRequestException('Invalid module access choice. Choose CMMS, IOT, or BOTH.');
    }
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { moduleAccess },
    });
    return this.sanitizeUser(updatedUser);
  }

  private sanitizeUser(user: any) {
    const sanitized = { ...user };
    delete sanitized.password;
    delete sanitized.refreshToken;
    return sanitized;
  }
}
