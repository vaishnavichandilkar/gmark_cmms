import { Injectable, ConflictException } from '@nestjs/common';
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
    const effectiveAdminId = currentUser?.adminId || currentUser?.userId;
    const whereClause: any = effectiveAdminId ? { adminId: effectiveAdminId } : {};

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
}
