import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class BuildingsService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(user: any, societyId?: number) {
    const whereClause: any = {};

    if (user.role === 'SUPER_ADMIN') {
      if (societyId !== undefined) {
        whereClause.societyId = societyId;
      }
    } else if (user.role === 'SOCIETY_ADMIN') {
      whereClause.societyId = user.societyId;
    } else {
      whereClause.societyId = user.societyId;
      whereClause.id = { in: user.buildingIds || [] };
    }

    const buildings = await this.prisma.building.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { devices: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    return buildings.map((b) => ({
      id: b.id,
      name: b.name,
      info: b.info,
      societyId: b.societyId,
      deviceCount: b._count.devices,
    }));
  }

  async findOne(id: number) {
    const building = await this.prisma.building.findUnique({
      where: { id },
    });
    if (!building) {
      throw new NotFoundException(`Building with ID ${id} not found`);
    }
    return building;
  }

  async create(data: { name: string; info?: string; societyId: number }) {
    return this.prisma.building.create({
      data: {
        name: data.name,
        info: data.info || '0F - 0 flats',
        societyId: data.societyId,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.building.delete({
      where: { id },
    });
  }

  async findDevicesByBuilding(id: number) {
    const building = await this.prisma.building.findUnique({
      where: { id },
      include: {
        devices: {
          select: {
            id: true,
            deviceId: true,
            name: true,
            template: true,
            systemName: true,
            cardNo: true,
            topic: true,
            application: true,
            pumpType: true,
            controller: true,
            macType: true,
            lastSeen: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!building) {
      throw new NotFoundException(`Building with ID ${id} not found`);
    }

    const now = new Date();
    return building.devices.map((device) => {
      const lastSeen = device.lastSeen || device.updatedAt;
      const diffMs = now.getTime() - lastSeen.getTime();
      const status = diffMs <= 60000 ? 'online' : 'offline';

      return {
        id: device.id,
        deviceId: device.deviceId,
        name: device.name,
        template: device.template,
        systemName: device.systemName,
        cardNo: device.cardNo,
        topic: device.topic,
        application: device.application,
        pumpType: device.pumpType,
        controller: device.controller,
        macType: device.macType,
        status,
        lastSeen,
      };
    });
  }

  async update(id: number, data: { name?: string; info?: string; societyId?: number }) {
    await this.findOne(id);
    return this.prisma.building.update({
      where: { id },
      data,
    });
  }
}
