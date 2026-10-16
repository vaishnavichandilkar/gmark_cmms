import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class SparePartsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Disabled auto-seeding on init to ensure database stays clean after reset
  }

  async seedInitialSpareParts() {
    const count = await this.prisma.sparePartMaster.count();
    if (count === 0) {
      await this.prisma.sparePartMaster.createMany({
        data: [
          {
            partCode: 'SP-BRG-001',
            partName: 'Heavy Duty Ball Bearing 6205-2RS',
            category: 'Mechanical',
            stockQuantity: 45,
            unitOfMeasure: 'PCS',
            unitCost: 1250,
            location: 'Bin A-12',
            description: 'Deep groove ball bearing for pump shaft assembly',
          },
          {
            partCode: 'SP-VLV-002',
            partName: 'Stainless Steel Butterfly Valve 2 Inch',
            category: 'Valves & Piping',
            stockQuantity: 20,
            unitOfMeasure: 'PCS',
            unitCost: 3400,
            location: 'Bin B-05',
            description: 'Flanged butterfly valve for water booster line',
          },
          {
            partCode: 'SP-GSK-003',
            partName: 'High-Temp Mechanical Seal Kit 32mm',
            category: 'Seals & Gaskets',
            stockQuantity: 30,
            unitOfMeasure: 'KIT',
            unitCost: 2100,
            location: 'Bin A-08',
            description: 'Viton shaft mechanical seal for booster pumps',
          },
          {
            partCode: 'SP-PRS-004',
            partName: 'Digital Pressure Switch Transducer 0-10 Bar',
            category: 'Instrumentation',
            stockQuantity: 15,
            unitOfMeasure: 'PCS',
            unitCost: 4800,
            location: 'Bin C-01',
            description: '4-20mA pressure transducer switch module',
          },
          {
            partCode: 'SP-FLT-005',
            partName: 'High-Flow Stainless Mesh Strainer Filter',
            category: 'Filters',
            stockQuantity: 50,
            unitOfMeasure: 'PCS',
            unitCost: 950,
            location: 'Bin D-03',
            description: 'Suction line Y-strainer replacement element',
          },
          {
            partCode: 'SP-MTR-006',
            partName: 'Flexible Rubber Jaw Coupling Element',
            category: 'Mechanical',
            stockQuantity: 35,
            unitOfMeasure: 'PCS',
            unitCost: 650,
            location: 'Bin A-15',
            description: 'Spider insert for motor pump flexible coupling',
          },
        ],
      });
    }
  }

  async getAllSpareParts(currentUser?: any) {
    const effectiveAdminId = currentUser?.adminId || currentUser?.userId;
    const where: any = effectiveAdminId
      ? { adminId: effectiveAdminId }
      : {};

    return this.prisma.sparePartMaster.findMany({
      where,
      orderBy: { partName: 'asc' },
    });
  }

  async getSparePartById(id: number) {
    return this.prisma.sparePartMaster.findUnique({ where: { id } });
  }

  async createSparePart(data: any, currentUser?: any) {
    const effectiveAdminId = currentUser?.adminId || currentUser?.userId || null;
    return this.prisma.sparePartMaster.create({
      data: {
        ...data,
        adminId: effectiveAdminId,
      },
    });
  }

  async updateSparePart(id: number, data: any) {
    return this.prisma.sparePartMaster.update({
      where: { id },
      data,
    });
  }

  async deleteSparePart(id: number) {
    return this.prisma.sparePartMaster.delete({
      where: { id },
    });
  }
}
