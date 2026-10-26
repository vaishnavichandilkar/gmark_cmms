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
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
    const effectiveAdminId = currentUser?.adminId || currentUser?.userId;

    if (!isSuperAdmin && effectiveAdminId) {
      whereClause.OR = [
        { adminId: effectiveAdminId },
        { id: effectiveAdminId }
      ];
    }

    if (societyId !== undefined) {
      whereClause.societyId = societyId;
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
        facility: true,
        society: true,
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
        facility: true,
        society: true,
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
    designation?: string;
    isActive?: boolean;
    societyId?: number;
    employeeId?: number;
    mainFacilityId?: number;
    facilityId?: number;
    deviceId?: string;
    deviceName?: string;
    buildingIds?: number[];
  }, currentUser?: any) {
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
    const effectiveAdminId = currentUser?.adminId || currentUser?.userId || null;

    const user = await this.prisma.user.create({
      data: {
        username: data.username,
        mobileNumber: data.mobileNumber,
        email: data.email,
        password: hashedPassword,
        plainPassword: rawPassword,
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
        designation: data.designation || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        societyId: data.societyId,
        employeeId: data.employeeId,
        mainFacilityId: data.mainFacilityId,
        facilityId: data.facilityId,
        deviceId: data.deviceId || null,
        deviceName: data.deviceName || null,
        adminId: effectiveAdminId,
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
      designation?: string;
      isActive?: boolean;
      buildingIds?: number[];
      societyId?: number;
      employeeId?: number;
      mainFacilityId?: number;
      facilityId?: number;
      deviceId?: string;
      deviceName?: string;
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
      updateData.plainPassword = data.password;
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
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        employee: true,
        mainFacility: true,
        facility: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const userOverrides = await this.prisma.userPermission.findMany({
      where: { userId: id },
    });

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

    const basePermissions = modules.map((moduleId) => {
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
          canCreate: false,
          canEdit: moduleId === 'machine_management' || moduleId === 'facility_management' || allTabModules.includes(moduleId),
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

    // 2. Overlay Designation permissions if user has designation
    const designationName = user.employee?.designation?.trim() || user.designation?.trim();
    if (designationName) {
      const designation = await this.prisma.designation.findFirst({
        where: { name: { equals: designationName, mode: 'insensitive' } },
        include: { permissions: true },
      });

      if (designation && designation.permissions && designation.permissions.length > 0) {
        designation.permissions.forEach((dp) => {
          const index = basePermissions.findIndex((p) => p.moduleId === dp.moduleId);
          if (index >= 0) {
            basePermissions[index] = {
              ...basePermissions[index],
              canView: dp.canView,
              canCreate: dp.canCreate,
              canEdit: dp.canEdit,
              canDelete: dp.canDelete,
              canImport: dp.canImport ?? false,
              canExport: dp.canExport ?? false,
              canPrint: dp.canPrint ?? false,
            };
          } else {
            basePermissions.push({
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

        // Inherit spares permission to tabs if not explicitly set in designation
        const sparesPerm = designation.permissions.find((p) => p.moduleId === 'spares');
        if (sparesPerm) {
          spareTabModules.forEach((tabMod) => {
            const hasExplicit = designation.permissions.some((p) => p.moduleId === tabMod);
            if (!hasExplicit) {
              const tIdx = basePermissions.findIndex((p) => p.moduleId === tabMod);
              if (tIdx >= 0) {
                basePermissions[tIdx] = {
                  ...basePermissions[tIdx],
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
              const tIdx = basePermissions.findIndex((p) => p.moduleId === tabMod);
              if (tIdx >= 0) {
                basePermissions[tIdx] = {
                  ...basePermissions[tIdx],
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
              const tIdx = basePermissions.findIndex((p) => p.moduleId === tabMod);
              if (tIdx >= 0) {
                basePermissions[tIdx] = {
                  ...basePermissions[tIdx],
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

    return {
      userId: id,
      designation: designationName || null,
      role: user.role,
      mainFacilityId: user.mainFacilityId,
      facilityId: user.facilityId,
      deviceId: user.deviceId,
      deviceName: user.deviceName,
      mainFacility: user.mainFacility,
      facility: user.facility,
      userOverrides,
      basePermissions,
    };
  }

  async updateUserPermissions(id: number, payload: any) {
    const permissions = Array.isArray(payload) ? payload : (payload?.permissions || []);
    const { mainFacilityId, facilityId, deviceId, deviceName } = Array.isArray(payload) ? {} : payload;

    // Verify user exists
    await this.findOne(id);

    // Run in a transaction: update user access scope if provided, delete old specific permissions and insert new ones
    return this.prisma.$transaction(async (tx) => {
      if (!Array.isArray(payload)) {
        const updateData: any = {};
        if (mainFacilityId !== undefined) {
          updateData.mainFacilityId = mainFacilityId ? Number(mainFacilityId) : null;
        }
        if (facilityId !== undefined) {
          updateData.facilityId = facilityId ? Number(facilityId) : null;
        }
        if (deviceId !== undefined) {
          updateData.deviceId = deviceId || null;
        }
        if (deviceName !== undefined) {
          updateData.deviceName = deviceName || null;
        }

        if (Object.keys(updateData).length > 0) {
          await tx.user.update({
            where: { id },
            data: updateData,
          });
        }
      }

      await tx.userPermission.deleteMany({
        where: { userId: id }
      });

      if (permissions && permissions.length > 0) {
        await tx.userPermission.createMany({
          data: permissions.map((p: any) => ({
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
