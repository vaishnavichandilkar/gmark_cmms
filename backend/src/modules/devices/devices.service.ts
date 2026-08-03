import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllDevices(user: any) {
    let whereClause: any = {};

    if (user.role === 'SUPER_ADMIN') {
      whereClause = {};
    } else if (user.role === 'SOCIETY_ADMIN') {
      whereClause = {
        building: { societyId: user.societyId },
      };
    } else {
      whereClause = {
        building: { societyId: user.societyId },
        buildingId: { in: user.buildingIds || [] },
      };
    }

    const devices = await this.prisma.device.findMany({
      where: whereClause,
      include: { building: true, facility: true },
    });

    const now = new Date();

    return devices.map((device) => {
      const lastSeen = device.lastSeen || device.updatedAt;
      const diffMs = now.getTime() - lastSeen.getTime();
      const status = diffMs <= 60000 ? 'online' : 'offline';

      const latestData: any = device.latestData || {};
      const alerts: string[] = [];
      
      if (latestData.inputPowerFaultType) alerts.push('Input Power Fault');
      if (latestData.pump1FaultType) alerts.push('Pump 1 Fault');
      if (latestData.pump2FaultType) alerts.push('Pump 2 Fault');
      if (latestData.pump3FaultType) alerts.push('Pump 3 Fault');
      if (latestData.pump4FaultType) alerts.push('Pump 4 Fault');

      return {
        id: device.id,
        deviceId: device.deviceId,
        name: device.name,
        building: device.building?.name || device.facility?.facilityName || 'Unassigned',
        buildingId: device.buildingId,
        facilityId: device.facilityId,
        topic: device.topic,
        status,
        lastSeen,
        alerts,
        alertCount: alerts.length,
        company: device.company,
        make: device.make,
        modelNumber: device.modelNumber,
        machineCategory: device.machineCategory,
        machineCode: device.machineCode,
      };
    });
  }

  async getDeviceById(id: number, user: any) {
    let whereClause: any = { id };

    if (user.role !== 'SUPER_ADMIN') {
      if (user.role === 'SOCIETY_ADMIN') {
        whereClause.building = { societyId: user.societyId };
      } else {
        whereClause.building = { societyId: user.societyId };
        whereClause.buildingId = { in: user.buildingIds || [] };
      }
    }

    const device = await this.prisma.device.findFirst({
      where: whereClause,
      include: { building: true, facility: true },
    });

    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    const now = new Date();
    const lastSeen = device.lastSeen || device.updatedAt;
    const diffMs = now.getTime() - lastSeen.getTime();
    const status = diffMs <= 60000 ? 'online' : 'offline';

    return {
      ...device,
      status,
    };
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
      include: { building: true, facility: true },
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
      building: device.building?.name || device.facility?.facilityName || 'Unassigned',
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

  async create(data: {
    name: string;
    deviceId: string;
    buildingId?: number;
    facilityId?: number;
    application?: string;
    pumpType?: string;
    controller?: string;
    macType?: string;
    company?: string;
    maintenanceHead?: string;
    machineCode?: string;
    serialNumber?: string;
    make?: string;
    modelNumber?: string;
    machineCategory?: string;
    machineSubCategory?: string;
    description?: string;
    assetCode?: string;
    isLocationPart?: boolean;
    costCenter?: string;
    headOfDepartment?: string;
    machineOwner?: string;
    latitude?: string;
    longitude?: string;
    notes?: string;
    parentDeviceId?: number;
  }) {
    const existing = await this.prisma.device.findUnique({
      where: { deviceId: data.deviceId },
    });
    if (existing) {
      throw new BadRequestException(`Device with Code ${data.deviceId} already exists`);
    }

    const device = await this.prisma.device.create({
      data: {
        deviceId: data.deviceId,
        name: data.name,
        buildingId: data.buildingId,
        facilityId: data.facilityId,
        topic: `AGC/SE-${data.deviceId}`,
        systemName: data.name,
        template: 'booster',
        application: data.application || 'DOMESTIC_WATER_SYS',
        pumpType: data.pumpType || 'WMP_BOOSTER_PUMP',
        controller: data.controller || 'AIPCU',
        macType: data.macType || 'Primary MAC',
        company: data.company,
        maintenanceHead: data.maintenanceHead,
        machineCode: data.machineCode,
        serialNumber: data.serialNumber,
        make: data.make,
        modelNumber: data.modelNumber,
        machineCategory: data.machineCategory,
        machineSubCategory: data.machineSubCategory,
        description: data.description,
        assetCode: data.assetCode,
        isLocationPart: data.isLocationPart,
        costCenter: data.costCenter,
        headOfDepartment: data.headOfDepartment,
        machineOwner: data.machineOwner,
        latitude: data.latitude,
        longitude: data.longitude,
        notes: data.notes,
        parentDeviceId: data.parentDeviceId,
      },
    });

    await this.prisma.deviceState.upsert({
      where: { deviceId: data.deviceId },
      update: {},
      create: { deviceId: data.deviceId },
    });

    return device;
  }

  async update(
    id: number,
    data: {
      name: string;
      deviceId: string;
      buildingId?: number;
      facilityId?: number;
      application?: string;
      pumpType?: string;
      controller?: string;
      macType?: string;
      company?: string;
      maintenanceHead?: string;
      machineCode?: string;
      serialNumber?: string;
      make?: string;
      modelNumber?: string;
      machineCategory?: string;
      machineSubCategory?: string;
      description?: string;
      assetCode?: string;
      isLocationPart?: boolean;
      costCenter?: string;
      headOfDepartment?: string;
      machineOwner?: string;
      latitude?: string;
      longitude?: string;
      notes?: string;
      parentDeviceId?: number;
    },
  ) {
    const device = await this.prisma.device.findUnique({
      where: { id },
    });
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    if (data.deviceId !== device.deviceId) {
      const existing = await this.prisma.device.findUnique({
        where: { deviceId: data.deviceId },
      });
      if (existing) {
        throw new BadRequestException(`Device with Code ${data.deviceId} already exists`);
      }
    }

    const updated = await this.prisma.device.update({
      where: { id },
      data: {
        name: data.name,
        deviceId: data.deviceId,
        buildingId: data.buildingId,
        facilityId: data.facilityId,
        topic: `AGC/SE-${data.deviceId}`,
        systemName: data.name,
        application: data.application,
        pumpType: data.pumpType,
        controller: data.controller,
        macType: data.macType,
        company: data.company,
        maintenanceHead: data.maintenanceHead,
        machineCode: data.machineCode,
        serialNumber: data.serialNumber,
        make: data.make,
        modelNumber: data.modelNumber,
        machineCategory: data.machineCategory,
        machineSubCategory: data.machineSubCategory,
        description: data.description,
        assetCode: data.assetCode,
        isLocationPart: data.isLocationPart,
        costCenter: data.costCenter,
        headOfDepartment: data.headOfDepartment,
        machineOwner: data.machineOwner,
        latitude: data.latitude,
        longitude: data.longitude,
        notes: data.notes,
        parentDeviceId: data.parentDeviceId,
      },
    });

    if (data.deviceId !== device.deviceId) {
      await this.prisma.deviceState.upsert({
        where: { deviceId: data.deviceId },
        update: {},
        create: { deviceId: data.deviceId },
      });
      try {
        await this.prisma.deviceState.delete({
          where: { deviceId: device.deviceId },
        });
      } catch (e) {
        // ignore
      }
    }

    return updated;
  }

  async remove(id: number) {
    const device = await this.prisma.device.findUnique({
      where: { id },
    });
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    await this.prisma.device.delete({
      where: { id },
    });

    try {
      await this.prisma.deviceState.delete({
        where: { deviceId: device.deviceId },
      });
    } catch (e) {
      // ignore
    }

    return device;
  }
}
