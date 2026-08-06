import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MachinesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllMachines(jwtUser: any) {
    // Fetch latest user data from DB to ensure we have mainFacilityId which might be missing in older JWTs
    const user = await this.prisma.user.findUnique({ 
      where: { id: jwtUser.userId },
      include: { employee: true }
    }) || jwtUser;

    let whereClause: any = {};

    if (user.role === 'SUPER_ADMIN') {
      whereClause = {};
    } else if (user.mainFacilityId) {
      // If user is assigned to a main facility, show machines in facilities under that main facility
      whereClause = {
        facility: { mainFacilityId: user.mainFacilityId },
      };
    } else if (user.role === 'SOCIETY_ADMIN') {
      whereClause = {
        building: { societyId: user.societyId },
      };
    } else {
      whereClause = { OR: [] };
      if (user.employee) {
        whereClause.OR.push({ machineOwner: user.employee.fullName });
        whereClause.OR.push({ maintenanceHead: user.employee.fullName });
      }
      if (jwtUser.buildingIds && jwtUser.buildingIds.length > 0) {
        whereClause.OR.push({ buildingId: { in: jwtUser.buildingIds } });
      }
      if (whereClause.OR.length === 0) {
        whereClause = { id: -1 }; // Return nothing
      }
    }

    const machines = await this.prisma.machine.findMany({
      where: whereClause,
      include: { building: true, facility: true },
    });

    const now = new Date();

    // To check online status, we must query devices if they have deviceId mapped
    const deviceIds = machines.map(m => m.deviceId).filter(id => id);
    let devices = [];
    if (deviceIds.length > 0) {
      devices = await this.prisma.device.findMany({
        where: { deviceId: { in: deviceIds as string[] } }
      });
    }
    const deviceMap = new Map(devices.map(d => [d.deviceId, d]));

    return machines.map((machine) => {
      let status = 'offline';
      let alerts: string[] = [];
      let lastSeen = machine.updatedAt;

      if (machine.deviceId && deviceMap.has(machine.deviceId)) {
        const device = deviceMap.get(machine.deviceId);
        lastSeen = device.lastSeen || device.updatedAt;
        const diffMs = now.getTime() - lastSeen.getTime();
        status = diffMs <= 60000 ? 'online' : 'offline';

        const latestData: any = device.latestData || {};
        if (latestData.inputPowerFaultType) alerts.push('Input Power Fault');
        if (latestData.pump1FaultType) alerts.push('Pump 1 Fault');
        if (latestData.pump2FaultType) alerts.push('Pump 2 Fault');
        if (latestData.pump3FaultType) alerts.push('Pump 3 Fault');
        if (latestData.pump4FaultType) alerts.push('Pump 4 Fault');
      }

      return {
        id: machine.id,
        name: machine.name,
        deviceId: machine.deviceId, // IoT MAC ID
        building: machine.building?.name || machine.facility?.facilityName || 'Unassigned',
        buildingId: machine.buildingId,
        facilityId: machine.facilityId,
        status,
        lastSeen,
        alerts,
        alertCount: alerts.length,
        company: machine.company,
        make: machine.make,
        modelNumber: machine.modelNumber,
        machineCategory: machine.machineCategory,
        machineCode: machine.machineCode,
        parentMachineId: machine.parentMachineId,
      };
    });
  }

  async getMachineById(id: number, jwtUser: any) {
    const user = await this.prisma.user.findUnique({ 
      where: { id: jwtUser.userId },
      include: { employee: true }
    }) || jwtUser;
    let whereClause: any = { id };

    if (user.role !== 'SUPER_ADMIN') {
      if (user.mainFacilityId) {
        whereClause.facility = { mainFacilityId: user.mainFacilityId };
      } else if (user.role === 'SOCIETY_ADMIN') {
        whereClause.building = { societyId: user.societyId };
      } else {
        const orConditions = [];
        if (user.employee) {
          orConditions.push({ machineOwner: user.employee.fullName });
          orConditions.push({ maintenanceHead: user.employee.fullName });
        }
        if (jwtUser.buildingIds && jwtUser.buildingIds.length > 0) {
          orConditions.push({ buildingId: { in: jwtUser.buildingIds } });
        }
        
        if (orConditions.length > 0) {
          whereClause.OR = orConditions;
        } else {
          whereClause.id = -1; // Return nothing
        }
      }
    }

    const machine = await this.prisma.machine.findFirst({
      where: whereClause,
      include: { building: true, facility: true },
    });

    if (!machine) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }

    let status = 'offline';
    if (machine.deviceId) {
      const device = await this.prisma.device.findUnique({
        where: { deviceId: machine.deviceId }
      });
      if (device) {
        const now = new Date();
        const lastSeen = device.lastSeen || device.updatedAt;
        const diffMs = now.getTime() - lastSeen.getTime();
        status = diffMs <= 60000 ? 'online' : 'offline';
      }
    }

    return {
      ...machine,
      status,
    };
  }

  async create(data: any) {
    if (data.deviceId) {
      const existing = await this.prisma.machine.findUnique({
        where: { deviceId: data.deviceId },
      });
      if (existing) {
        throw new BadRequestException(`Machine with MAC ID ${data.deviceId} already exists`);
      }
    }

    const machine = await this.prisma.machine.create({
      data: {
        name: data.name,
        deviceId: data.deviceId || null,
        buildingId: data.buildingId,
        facilityId: data.facilityId,
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
        parentMachineId: data.parentDeviceId, // It was parentDeviceId on frontend
      },
    });

    return machine;
  }

  async update(id: number, data: any) {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
    });
    if (!machine) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }

    if (data.deviceId && data.deviceId !== machine.deviceId) {
      const existing = await this.prisma.machine.findUnique({
        where: { deviceId: data.deviceId },
      });
      if (existing) {
        throw new BadRequestException(`Machine with MAC ID ${data.deviceId} already exists`);
      }
    }

    const updated = await this.prisma.machine.update({
      where: { id },
      data: {
        name: data.name,
        deviceId: data.deviceId || null,
        buildingId: data.buildingId,
        facilityId: data.facilityId,
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
        parentMachineId: data.parentDeviceId,
      },
    });

    return updated;
  }

  async remove(id: number) {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
    });
    if (!machine) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }

    await this.prisma.machine.delete({
      where: { id },
    });

    return machine;
  }

  async addSpecification(id: number, data: { title: string; inputType: string; data: string; unit?: string }) {
    return this.prisma.machineSpecification.create({
      data: {
        machineId: id,
        title: data.title,
        inputType: data.inputType,
        data: data.data,
        unit: data.unit || null,
      },
    });
  }

  async addDocument(id: number, data: any) {
    return this.prisma.machineDocument.create({
      data: {
        machineId: id,
        name: data.name || 'Document',
        type: data.type || 'File',
        content: data.content || 'Uploaded File',
      },
    });
  }
}
