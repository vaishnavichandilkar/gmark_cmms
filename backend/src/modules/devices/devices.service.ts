import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllDevices() {
    const devices = await this.prisma.device.findMany({
      include: { building: true },
    });

    const now = new Date();

    return devices.map((device) => {
      const lastSeen = device.lastSeen || device.updatedAt;
      const diffMs = now.getTime() - lastSeen.getTime();
      const status = diffMs <= 60000 ? 'online' : 'offline';

      return {
        id: device.id,
        deviceId: device.deviceId,
        name: device.name,
        building: device.building.name,
        topic: device.topic,
        status,
        lastSeen,
      };
    });
  }

  async getDeviceSnapshot(deviceId: string) {
    const values = await this.prisma.deviceRegisterValue.findMany({
      where: { deviceId },
      include: { register: true },
      orderBy: { register: { address: 'asc' } },
    });

    if (values.length > 0) {
      return {
        deviceId,
        payload: {
          registers: values.map((v) => ({
            register: v.register.address,
            value: v.value,
          })),
        },
        createdAt: values[0]?.updatedAt || new Date(),
      };
    }

    const snapshot = await this.prisma.deviceSnapshot.findFirst({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
    });

    if (!snapshot) {
      throw new NotFoundException(`No snapshot found for device ${deviceId}`);
    }

    return snapshot;
  }

  async getDeviceDashboard(deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { deviceId },
      include: { building: true },
    });

    if (!device) {
      throw new NotFoundException(`Device with ID ${deviceId} not found`);
    }

    const lastSeen = device.lastSeen || device.updatedAt;
    const now = new Date();

    // Check if data received within 60 seconds
    const diffMs = now.getTime() - lastSeen.getTime();
    const status = diffMs <= 60000 ? 'online' : 'offline';

    const latestData: any = device.latestData || {};

    return {
      deviceId: device.deviceId,
      topic: device.topic,
      building: device.building.name,
      system: device.systemName || device.name,
      status,
      ...latestData,
      faultCount:
        (latestData.pump1FaultType ? 1 : 0) +
        (latestData.pump2FaultType ? 1 : 0) +
        (latestData.inputPowerFaultType ? 1 : 0),
      lastSeen,
    };
  }
}
