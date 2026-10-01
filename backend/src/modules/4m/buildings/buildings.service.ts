import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class BuildingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: any, societyId?: number) {
    const whereClause: any = {};

    if (user.role === 'SUPER_ADMIN' || !user.societyId) {
      if (societyId !== undefined) {
        whereClause.societyId = societyId;
      }
    } else if (user.role === 'SOCIETY_ADMIN') {
      if (societyId !== undefined) {
        whereClause.societyId = societyId;
      } else if (user.societyId) {
        whereClause.societyId = user.societyId;
      }
    } else {
      if (user.societyId) {
        whereClause.societyId = user.societyId;
      }
      if (user.buildingIds && user.buildingIds.length > 0) {
        whereClause.id = { in: user.buildingIds };
      }
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
      mainFacilityId: b.mainFacilityId,
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

  async update(
    id: number,
    data: { name?: string; info?: string; societyId?: number | null; mainFacilityId?: number | null },
  ) {
    await this.findOne(id);
    return this.prisma.building.update({
      where: { id },
      data,
    });
  }

  async moveBuilding(id: number, target: { targetType: 'society' | 'mainFacility'; targetId: number }) {
    await this.findOne(id);

    if (target.targetType === 'society') {
      const society = await this.prisma.society.findUnique({ where: { id: target.targetId } });
      if (!society) {
        throw new NotFoundException(`Society with ID ${target.targetId} not found`);
      }
      return this.prisma.building.update({
        where: { id },
        data: {
          societyId: target.targetId,
          mainFacilityId: null,
        },
      });
    } else if (target.targetType === 'mainFacility') {
      const mainFacility = await this.prisma.mainFacility.findUnique({ where: { id: target.targetId } });
      if (!mainFacility) {
        throw new NotFoundException(`Main Facility with ID ${target.targetId} not found`);
      }
      const updated = await this.prisma.building.update({
        where: { id },
        data: {
          mainFacilityId: target.targetId,
          societyId: null,
        },
      });

      // Also update machines inside this building to reflect new company
      await this.prisma.machine.updateMany({
        where: { buildingId: id },
        data: { company: String(target.targetId) },
      });

      return updated;
    } else {
      throw new BadRequestException(`Invalid targetType: ${target.targetType}`);
    }
  }
}
