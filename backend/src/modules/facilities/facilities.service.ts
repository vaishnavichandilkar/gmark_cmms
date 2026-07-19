import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class FacilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: any) {
    const existingFacility = await this.prisma.facility.findFirst({
      where: {
        facilityCode: createDto.facilityCode
      }
    });

    if (existingFacility) {
      throw new ConflictException('Facility Code already exists');
    }

    return this.prisma.facility.create({
      data: createDto,
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
    const lastFacility = await this.prisma.facility.findFirst({
      orderBy: { id: 'desc' }
    });
    
    if (!lastFacility || !lastFacility.facilityCode) {
      return { nextCode: 'FL001' };
    }
    
    const match = lastFacility.facilityCode.match(/FL(\d+)/i);
    
    if (match && match[1]) {
      const nextNum = parseInt(match[1], 10) + 1;
      return { nextCode: `FL${nextNum.toString().padStart(3, '0')}` };
    }
    
    return { nextCode: 'FL001' };
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
