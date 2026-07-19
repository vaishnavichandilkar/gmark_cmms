import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateMainFacilityDto } from './dto/create-main-facility.dto';

@Injectable()
export class MainFacilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateMainFacilityDto) {
    const existingFacility = await this.prisma.mainFacility.findFirst({
      where: {
        OR: [
          { mainFacilityCode: createDto.mainFacilityCode },
          { gstNumber: createDto.gstNumber }
        ]
      }
    });

    if (existingFacility) {
      if (existingFacility.mainFacilityCode === createDto.mainFacilityCode) {
        throw new ConflictException('Main Facility Code already exists');
      }
      if (existingFacility.gstNumber === createDto.gstNumber) {
        throw new ConflictException('GST Number already exists');
      }
    }

    return this.prisma.mainFacility.create({
      data: createDto,
    });
  }

  async findAll() {
    return this.prisma.mainFacility.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async getNextFacilityCode() {
    const lastFacility = await this.prisma.mainFacility.findFirst({
      orderBy: { id: 'desc' },
    });

    if (!lastFacility || !lastFacility.mainFacilityCode) {
      return { nextCode: 'MF001' };
    }

    const lastCode = lastFacility.mainFacilityCode;
    const match = lastCode.match(/(\d+)$/);
    
    if (match) {
      const numStr = match[1];
      const nextNum = parseInt(numStr, 10) + 1;
      return { nextCode: `MF${nextNum.toString().padStart(3, '0')}` };
    }

    return { nextCode: 'MF001' };
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
