import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class BuildingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const buildings = await this.prisma.building.findMany({
      include: {
        _count: {
          select: { devices: true },
        },
      },
    });

    return buildings.map((b) => ({
      id: b.id,
      name: b.name,
      deviceCount: b._count.devices,
    }));
  }

  async findDevicesByBuilding(id: number) {
    const building = await this.prisma.building.findUnique({
      where: { id },
      include: {
        devices: {
          select: {
            deviceId: true,
            name: true,
          },
        },
      },
    });

    if (!building) {
      throw new NotFoundException(`Building with ID ${id} not found`);
    }

    return building.devices;
  }
}
