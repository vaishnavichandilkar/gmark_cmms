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

  async findAll(currentUser?: any) {
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
    const effectiveAdminId = isSuperAdmin ? null : (currentUser?.adminId || currentUser?.userId);
    const whereClause: any = effectiveAdminId ? { adminId: effectiveAdminId } : {};

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

    return this.prisma.mainFacility.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });
  }

  async getNextFacilityCode() {
    const nextCode = await this.codeSequenceService.previewNextCode('MAIN_FACILITY');
    return { nextCode };
  }

  async findOne(id: number) {
    return this.prisma.mainFacility.findUnique({
      where: { id },
    });
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
      }

      return {
        success: true,
        mainFacilityId,
        assignedUserCount: targetUserIds.length,
      };
    });
  }
}
