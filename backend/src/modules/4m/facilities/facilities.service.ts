import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CodeSequenceService } from '../../../common/services/code-sequence.service';

@Injectable()
export class FacilitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codeSequenceService: CodeSequenceService
  ) {}

  async create(createDto: any) {
    // Generate the real unique code at insertion time
    const realFacilityCode = await this.codeSequenceService.generateNextCode('FACILITY');

    return this.prisma.facility.create({
      data: {
        ...createDto,
        facilityCode: realFacilityCode,
      },
    });
  }

  async findAll() {
    return this.prisma.facility.findMany({
      include: {
        mainFacility: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getNextFacilityCode() {
    const nextCode = await this.codeSequenceService.previewNextCode('FACILITY');
    return { nextCode };
  }

  async findOne(id: number) {
    return this.prisma.facility.findUnique({
      where: { id },
      include: {
        mainFacility: true
      }
    });
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
}
