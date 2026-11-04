import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateMainFacilityDto } from './dto/create-main-facility.dto';
import { CodeSequenceService } from '../../../common/services/code-sequence.service';

@Injectable()
export class MainFacilitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codeSequenceService: CodeSequenceService
  ) {}

  async create(createDto: CreateMainFacilityDto, currentUser?: any) {
    const existingFacility = await this.prisma.mainFacility.findFirst({
      where: {
        OR: [
          { mainFacilityCode: createDto.mainFacilityCode },
          { gstNumber: createDto.gstNumber }
        ]
      }
    });

    if (existingFacility) {
      if (existingFacility.gstNumber === createDto.gstNumber) {
        throw new ConflictException('GST Number already exists');
      }
      // If code exists, it will just get a new unique code anyway
    }

    // Generate the real unique code at insertion time
    const realFacilityCode = await this.codeSequenceService.generateNextCode('MAIN_FACILITY');
    const effectiveAdminId = currentUser?.adminId || currentUser?.userId || null;

    return this.prisma.mainFacility.create({
      data: {
        ...createDto,
        mainFacilityCode: realFacilityCode,
        adminId: effectiveAdminId,
      },
    });
  }

  private async getUserAssetPermissions(user: any, effectiveAdminId: number | null) {
    if (!user || user.role === 'SUPER_ADMIN') {
      return { isSuperAdmin: true, hasAssetPerms: false, permsMap: new Map<string, any>() };
    }

    const userId = user.id || user.userId;
    if (!userId) {
      return { isSuperAdmin: false, hasAssetPerms: false, permsMap: new Map<string, any>() };
    }

    const userPermissions = await this.prisma.userPermission.findMany({
      where: { userId },
    });

    let desigPermissions: any[] = [];
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });
    const userDesignationName = dbUser?.designation || dbUser?.employee?.designation;
    if (userDesignationName) {
      const designation = await this.prisma.designation.findFirst({
        where: {
          name: { equals: userDesignationName.trim(), mode: 'insensitive' },
          ...(effectiveAdminId ? { adminId: effectiveAdminId } : {}),
        },
        include: { permissions: true },
      });
      if (designation?.permissions) {
        desigPermissions = designation.permissions;
      }
    }

    const permsMap = new Map<string, any>();
    desigPermissions.forEach((p) => permsMap.set(p.moduleId, p));
    userPermissions.forEach((p) => permsMap.set(p.moduleId, p));

    const hasAssetPerms = Array.from(permsMap.keys()).some((k) => k.startsWith('asset_'));

    return { isSuperAdmin: false, hasAssetPerms, permsMap };
  }

  private canViewMainFacility(mf: any, permsMap: Map<string, any>): boolean {
    const mfPerm = permsMap.get(`asset_mf_${mf.id}`);
    if (mfPerm) {
      return !!mfPerm.canView;
    }
    const assetRoot = permsMap.get('assets');
    if (assetRoot) {
      return !!assetRoot.canView;
    }
    return false;
  }

  async findAll(currentUser?: any, includeAll: boolean = false) {
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
    const effectiveAdminId = isSuperAdmin ? null : (currentUser?.adminId || currentUser?.userId);
    const whereClause: any = effectiveAdminId ? { adminId: effectiveAdminId } : {};

    if (!includeAll) {
      if (currentUser?.mainFacilityId) {
        whereClause.id = currentUser.mainFacilityId;
      } else if (currentUser?.facilityId) {
        const fac = await this.prisma.facility.findUnique({
          where: { id: currentUser.facilityId },
          select: { mainFacilityId: true },
        });
        if (fac?.mainFacilityId) {
          whereClause.id = fac.mainFacilityId;
        }
      }
    }

    let mainFacilities = await this.prisma.mainFacility.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    const { isSuperAdmin: noFilter, hasAssetPerms, permsMap } = await this.getUserAssetPermissions(currentUser, effectiveAdminId);
    if (!noFilter && hasAssetPerms && !includeAll) {
      mainFacilities = mainFacilities.filter(mf => this.canViewMainFacility(mf, permsMap));
    }

    return mainFacilities;
  }

  async getNextFacilityCode() {
    const nextCode = await this.codeSequenceService.previewNextCode('MAIN_FACILITY');
    return { nextCode };
  }

  async findOne(id: number, currentUser?: any) {
    const mainFacility = await this.prisma.mainFacility.findUnique({
      where: { id },
    });

    if (!mainFacility) {
      throw new NotFoundException(`Main Facility with ID ${id} not found`);
    }

    if (currentUser) {
      const effectiveAdminId = currentUser.role === 'SUPER_ADMIN' ? null : (currentUser.adminId || currentUser.userId);
      const { isSuperAdmin, hasAssetPerms, permsMap } = await this.getUserAssetPermissions(currentUser, effectiveAdminId);
      if (!isSuperAdmin && hasAssetPerms && !this.canViewMainFacility(mainFacility, permsMap)) {
        throw new NotFoundException(`Main Facility with ID ${id} not found`);
      }
    }

    return mainFacility;
  }

  async update(id: number, updateDto: any) {
    return this.prisma.mainFacility.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: number) {
    return this.prisma.mainFacility.delete({
      where: { id },
    });
  }

  async getMainFacilityUsers(mainFacilityId: number) {
    const mainFacility = await this.prisma.mainFacility.findUnique({
      where: { id: mainFacilityId },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            designation: true,
            employeeId: true,
            employee: {
              select: {
                id: true,
                fullName: true,
                employeeCode: true,
                department: true,
              },
            },
          },
        },
      },
    });
    if (!mainFacility) {
      throw new NotFoundException(`Main Facility #${mainFacilityId} not found`);
    }
    return mainFacility.users || [];
  }

  async assignMainFacilityUsers(mainFacilityId: number, userIds: number[]) {
    const mainFacility = await this.prisma.mainFacility.findUnique({
      where: { id: mainFacilityId },
    });
    if (!mainFacility) {
      throw new NotFoundException(`Main Facility #${mainFacilityId} not found`);
    }

    const targetUserIds = Array.isArray(userIds) ? userIds.map(Number) : [];

    return this.prisma.$transaction(async (tx) => {
      // 1. Unassign users currently assigned directly to this mainFacility who are not in targetUserIds
      const removedUsers = await tx.user.findMany({
        where: {
          mainFacilityId: mainFacilityId,
          facilityId: null,
          id: { notIn: targetUserIds },
        },
        select: { id: true },
      });

      await tx.user.updateMany({
        where: {
          mainFacilityId: mainFacilityId,
          facilityId: null,
          id: { notIn: targetUserIds },
        },
        data: {
          mainFacilityId: null,
        },
      });

      for (const u of removedUsers) {
        await tx.userPermission.deleteMany({
          where: {
            userId: u.id,
            moduleId: `asset_mf_${mainFacilityId}`,
          },
        });
      }

      // 2. Assign target users to this mainFacility
      if (targetUserIds.length > 0) {
        await tx.user.updateMany({
          where: {
            id: { in: targetUserIds },
          },
          data: {
            mainFacilityId: mainFacilityId,
          },
        });

        for (const uId of targetUserIds) {
          await tx.userPermission.upsert({
            where: { userId_moduleId: { userId: uId, moduleId: 'assets' } },
            create: { userId: uId, moduleId: 'assets', canView: true },
            update: { canView: true },
          });

          await tx.userPermission.upsert({
            where: { userId_moduleId: { userId: uId, moduleId: `asset_mf_${mainFacilityId}` } },
            create: {
              userId: uId,
              moduleId: `asset_mf_${mainFacilityId}`,
              canView: true,
              canCreate: true,
              canEdit: true,
              canDelete: true,
              canExport: true,
              canPrint: true,
            },
            update: {
              canView: true,
            },
          });
        }
      }

      return {
        success: true,
        mainFacilityId,
        assignedUserCount: targetUserIds.length,
      };
    });
  }
}
