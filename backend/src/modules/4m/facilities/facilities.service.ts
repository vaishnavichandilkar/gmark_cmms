import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CodeSequenceService } from '../../../common/services/code-sequence.service';

@Injectable()
export class FacilitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codeSequenceService: CodeSequenceService
  ) {}

  async create(createDto: any, currentUser?: any) {
    // Generate the real unique code at insertion time
    const realFacilityCode = await this.codeSequenceService.generateNextCode('FACILITY');
    const effectiveAdminId = currentUser?.adminId || currentUser?.userId || null;

    return this.prisma.facility.create({
      data: {
        ...createDto,
        facilityCode: realFacilityCode,
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

  private canViewFacility(
    facility: any,
    permsMap: Map<string, any>,
    facMap?: Map<number, any>,
    currentUser?: any,
  ): boolean {
    if (permsMap.get('assets')?.canView) {
      return true;
    }
    const facPerm = permsMap.get(`asset_fac_${facility.id}`);
    if (facPerm?.canView) {
      return true;
    }
    if (currentUser?.facilityId && Number(currentUser.facilityId) === Number(facility.id)) {
      return true;
    }

    // Walk up ancestor facilities
    let currId: number | null = facility.parentFacilityId ? Number(facility.parentFacilityId) : null;
    while (currId) {
      if (permsMap.get(`asset_fac_${currId}`)?.canView) {
        return true;
      }
      if (currentUser?.facilityId && Number(currentUser.facilityId) === currId) {
        return true;
      }
      const parent = facMap?.get(currId);
      currId = parent?.parentFacilityId ? Number(parent.parentFacilityId) : null;
    }

    const mainFacId = facility.mainFacilityId || facility.mainFacility?.id;
    if (mainFacId) {
      const numMfId = Number(mainFacId);
      if (permsMap.get(`asset_mf_${numMfId}`)?.canView) {
        return true;
      }
      if (currentUser?.mainFacilityId && Number(currentUser.mainFacilityId) === numMfId) {
        return true;
      }
    }
    return false;
  }

  async findAll(currentUser?: any, includeAll: boolean = false) {
    const isPlatformSuperAdmin = currentUser?.id === 1 || currentUser?.email === 'superadmin@hypn.com';
    const effectiveAdminId = isPlatformSuperAdmin ? null : (currentUser?.adminId || currentUser?.userId);
    const whereClause: any = effectiveAdminId ? {
      OR: [
        { adminId: effectiveAdminId },
        { mainFacility: { adminId: effectiveAdminId } }
      ]
    } : {};

    // Pre-fetch all facilities for hierarchy lookup and recursive inheritance
    const allFacs = await this.prisma.facility.findMany({
      select: { id: true, parentFacilityId: true, mainFacilityId: true },
    });
    const facMap = new Map<number, any>(allFacs.map((f) => [f.id, f]));

    if (!includeAll) {
      if (currentUser?.facilityId) {
        const targetFacId = Number(currentUser.facilityId);
        const allowedFacilityIds = new Set<number>([targetFacId]);
        let added = true;
        while (added) {
          added = false;
          allFacs.forEach((f) => {
            if (f.parentFacilityId && allowedFacilityIds.has(Number(f.parentFacilityId)) && !allowedFacilityIds.has(Number(f.id))) {
              allowedFacilityIds.add(Number(f.id));
              added = true;
            }
          });
        }
        whereClause.id = { in: Array.from(allowedFacilityIds) };
      } else if (currentUser?.mainFacilityId) {
        whereClause.mainFacilityId = currentUser.mainFacilityId;
      }
    }

    let facilities = await this.prisma.facility.findMany({
      where: whereClause,
      include: {
        mainFacility: true,
        parentFacility: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    const { isSuperAdmin: noFilter, hasAssetPerms, permsMap } = await this.getUserAssetPermissions(currentUser, effectiveAdminId);
    if (!noFilter && hasAssetPerms && !includeAll) {
      facilities = facilities.filter(f => this.canViewFacility(f, permsMap, facMap, currentUser));
    }

    return facilities;
  }

  async getNextFacilityCode() {
    const nextCode = await this.codeSequenceService.previewNextCode('FACILITY');
    return { nextCode };
  }

  async findOne(id: number, currentUser?: any) {
    const facility = await this.prisma.facility.findUnique({
      where: { id },
      include: {
        mainFacility: true,
        parentFacility: true,
      }
    });

    if (!facility) {
      throw new NotFoundException(`Facility with ID ${id} not found`);
    }

    if (currentUser) {
      const effectiveAdminId = currentUser.role === 'SUPER_ADMIN' ? null : (currentUser.adminId || currentUser.userId);
      const { isSuperAdmin, hasAssetPerms, permsMap } = await this.getUserAssetPermissions(currentUser, effectiveAdminId);
      if (!isSuperAdmin && hasAssetPerms && !this.canViewFacility(facility, permsMap)) {
        throw new NotFoundException(`Facility with ID ${id} not found`);
      }
    }

    return facility;
  }

  async update(id: number, updateDto: any) {
    return this.prisma.facility.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: number) {
    return this.prisma.facility.delete({
      where: { id },
    });
  }

  async moveFacility(id: number, target: { targetType: 'mainFacility' | 'facility'; targetId: number }) {
    const facility = await this.prisma.facility.findUnique({
      where: { id },
    });
    if (!facility) {
      throw new NotFoundException(`Facility with ID ${id} not found`);
    }

    if (target.targetType === 'mainFacility') {
      const mainFacility = await this.prisma.mainFacility.findUnique({
        where: { id: target.targetId },
      });
      if (!mainFacility) {
        throw new NotFoundException(`Main Facility with ID ${target.targetId} not found`);
      }

      const updated = await this.prisma.facility.update({
        where: { id },
        data: {
          mainFacilityId: target.targetId,
          parentFacilityId: null,
          isLocationPart: false,
        },
      });

      await this.updateDescendantMainFacility(id, target.targetId);
      return updated;
    } else if (target.targetType === 'facility') {
      if (id === target.targetId) {
        throw new BadRequestException('Cannot move a facility into itself');
      }

      const targetFacility = await this.prisma.facility.findUnique({
        where: { id: target.targetId },
      });
      if (!targetFacility) {
        throw new NotFoundException(`Target Facility with ID ${target.targetId} not found`);
      }

      const isDescendant = await this.checkIsDescendant(target.targetId, id);
      if (isDescendant) {
        throw new BadRequestException('Cannot move a facility into one of its own sub-facilities');
      }

      const updated = await this.prisma.facility.update({
        where: { id },
        data: {
          parentFacilityId: target.targetId,
          mainFacilityId: targetFacility.mainFacilityId,
          isLocationPart: true,
        },
      });

      await this.updateDescendantMainFacility(id, targetFacility.mainFacilityId);
      return updated;
    } else {
      throw new BadRequestException(`Invalid targetType: ${target.targetType}`);
    }
  }

  private async checkIsDescendant(potentialChildId: number, ancestorId: number): Promise<boolean> {
    let currentId: number | null = potentialChildId;
    const visited = new Set<number>();
    while (currentId !== null) {
      if (currentId === ancestorId) return true;
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const curr = await this.prisma.facility.findUnique({
        where: { id: currentId },
        select: { parentFacilityId: true },
      });
      currentId = curr?.parentFacilityId || null;
    }
    return false;
  }

  private async updateDescendantMainFacility(facilityId: number, newMainFacilityId: number) {
    const children = await this.prisma.facility.findMany({
      where: { parentFacilityId: facilityId },
      select: { id: true },
    });

    for (const child of children) {
      await this.prisma.facility.update({
        where: { id: child.id },
        data: { mainFacilityId: newMainFacilityId },
      });
      await this.prisma.machine.updateMany({
        where: { facilityId: child.id },
        data: { company: String(newMainFacilityId) },
      });
      await this.updateDescendantMainFacility(child.id, newMainFacilityId);
    }

    await this.prisma.machine.updateMany({
      where: { facilityId },
      data: { company: String(newMainFacilityId) },
    });
  }

  async getFacilityUsers(facilityId: number) {
    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
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
    if (!facility) {
      throw new NotFoundException(`Facility #${facilityId} not found`);
    }
    return facility.users || [];
  }

  async assignFacilityUsers(facilityId: number, userIds: number[]) {
    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
    });
    if (!facility) {
      throw new NotFoundException(`Facility #${facilityId} not found`);
    }

    const targetUserIds = Array.isArray(userIds) ? userIds.map(Number) : [];

    return this.prisma.$transaction(async (tx) => {
      // 1. Unassign users currently assigned to this facility who are not in targetUserIds
      const removedUsers = await tx.user.findMany({
        where: {
          facilityId: facilityId,
          id: { notIn: targetUserIds },
        },
        select: { id: true },
      });

      await tx.user.updateMany({
        where: {
          facilityId: facilityId,
          id: { notIn: targetUserIds },
        },
        data: {
          facilityId: null,
        },
      });

      for (const u of removedUsers) {
        await tx.userPermission.deleteMany({
          where: {
            userId: u.id,
            moduleId: `asset_fac_${facilityId}`,
          },
        });
      }

      // 2. Assign target users to this facility (and inherit mainFacilityId)
      if (targetUserIds.length > 0) {
        await tx.user.updateMany({
          where: {
            id: { in: targetUserIds },
          },
          data: {
            facilityId: facilityId,
            mainFacilityId: facility.mainFacilityId || null,
          },
        });

        // Ensure each assigned user has view permissions for this facility and root assets
        for (const uId of targetUserIds) {
          await tx.userPermission.upsert({
            where: { userId_moduleId: { userId: uId, moduleId: 'assets' } },
            create: { userId: uId, moduleId: 'assets', canView: true },
            update: { canView: true },
          });

          await tx.userPermission.upsert({
            where: { userId_moduleId: { userId: uId, moduleId: `asset_fac_${facilityId}` } },
            create: {
              userId: uId,
              moduleId: `asset_fac_${facilityId}`,
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
        facilityId,
        assignedUserCount: targetUserIds.length,
      };
    });
  }
}
