import { Injectable, ConflictException } from '@nestjs/common';
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
}
