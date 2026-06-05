import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async getDeviceDashboard(deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { deviceId },
      include: { building: true },
    });

    if (!device) {
      throw new NotFoundException(`Device with ID ${deviceId} not found`);
    }

    const lastSeen = device.updatedAt;
    const now = new Date();
    
    // Check if data received within 60 seconds
    const diffMs = now.getTime() - lastSeen.getTime();
    const status = diffMs <= 60000 ? 'online' : 'offline';

    return {
      deviceId: device.deviceId,
      name: device.name,
      building: device.building.name,
      status,
      lastSeen,
      latestData: device.latestData || {},
    };
  }
}
