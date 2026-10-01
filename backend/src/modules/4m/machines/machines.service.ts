import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CodeSequenceService } from '../../../common/services/code-sequence.service';

@Injectable()
export class MachinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codeSequenceService: CodeSequenceService,
  ) {}

  async getNextMachineCode() {
    const nextCode = await this.codeSequenceService.previewNextCode('MACHINE');
    return { nextCode };
  }

  async getNextAssetCode() {
    const nextCode = await this.codeSequenceService.previewNextCode('ASSET');
    return { nextCode };
  }

  async getNextCodes() {
    const [nextMachineCode, nextAssetCode] = await Promise.all([
      this.codeSequenceService.previewNextCode('MACHINE'),
      this.codeSequenceService.previewNextCode('ASSET'),
    ]);
    return { nextMachineCode, nextAssetCode, nextCode: nextMachineCode };
  }

  async getAllMachines(jwtUser: any) {
    // Fetch latest user data from DB to ensure we have mainFacilityId which might be missing in older JWTs
    const user = await this.prisma.user.findUnique({ 
      where: { id: jwtUser.userId },
      include: { employee: true }
    }) || jwtUser;

    let whereClause: any = {};

    if (user.role === 'SUPER_ADMIN') {
      whereClause = {};
    } else if (user.deviceId) {
      whereClause = { deviceId: user.deviceId };
    } else if (user.facilityId) {
      const childFacilities = await this.prisma.facility.findMany({
        where: { parentFacilityId: user.facilityId },
        select: { id: true },
      });
      const facilityIds = [user.facilityId, ...childFacilities.map(f => f.id)];
      whereClause = {
        facilityId: { in: facilityIds },
      };
    } else if (user.mainFacilityId) {
      // If user is assigned to a main facility, show machines in facilities under that main facility
      whereClause = {
        facility: { mainFacilityId: user.mainFacilityId },
      };
    } else if (user.role === 'SOCIETY_ADMIN') {
      if (user.societyId) {
        whereClause = {
          building: { societyId: user.societyId },
        };
      }
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
      if (user.deviceId) {
        whereClause.deviceId = user.deviceId;
      } else if (user.facilityId) {
        const childFacilities = await this.prisma.facility.findMany({
          where: { parentFacilityId: user.facilityId },
          select: { id: true },
        });
        const facilityIds = [user.facilityId, ...childFacilities.map(f => f.id)];
        whereClause.facilityId = { in: facilityIds };
      } else if (user.mainFacilityId) {
        whereClause.facility = { mainFacilityId: user.mainFacilityId };
      } else if (user.role === 'SOCIETY_ADMIN') {
        if (user.societyId) {
          whereClause.building = { societyId: user.societyId };
        }
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

    // Auto-generate Machine Code if empty or advance sequence if previewed code was used
    let realMachineCode = data.machineCode ? data.machineCode.trim() : '';
    const nextMachinePreview = await this.codeSequenceService.previewNextCode('MACHINE');

    if (!realMachineCode || realMachineCode === nextMachinePreview) {
      realMachineCode = await this.codeSequenceService.generateNextCode('MACHINE');
    } else if (realMachineCode.startsWith('MCH')) {
      const num = parseInt(realMachineCode.replace(/^\D+/, ''), 10);
      if (!isNaN(num)) {
        const seq = await this.prisma.codeSequence.findUnique({ where: { id: 'MACHINE' } });
        if (seq && seq.lastValue < num) {
          await this.prisma.codeSequence.update({
            where: { id: 'MACHINE' },
            data: { lastValue: num },
          });
        }
      }
    }

    // Auto-generate Asset Code if empty or advance sequence if previewed code was used
    let realAssetCode = data.assetCode ? data.assetCode.trim() : '';
    const nextAssetPreview = await this.codeSequenceService.previewNextCode('ASSET');

    if (!realAssetCode || realAssetCode === nextAssetPreview) {
      realAssetCode = await this.codeSequenceService.generateNextCode('ASSET');
    } else if (realAssetCode.startsWith('AST')) {
      const num = parseInt(realAssetCode.replace(/^\D+/, ''), 10);
      if (!isNaN(num)) {
        const seq = await this.prisma.codeSequence.findUnique({ where: { id: 'ASSET' } });
        if (seq && seq.lastValue < num) {
          await this.prisma.codeSequence.update({
            where: { id: 'ASSET' },
            data: { lastValue: num },
          });
        }
      }
    }

    const machine = await this.prisma.machine.create({
      data: {
        name: data.name,
        deviceId: data.deviceId || null,
        buildingId: data.buildingId,
        facilityId: data.facilityId,
        machineType: data.machineType || data.machineCategory || null,
        company: data.company,
        maintenanceHead: data.maintenanceHead,
        machineCode: realMachineCode,
        serialNumber: data.serialNumber,
        make: data.make,
        modelNumber: data.modelNumber,
        machineCategory: data.machineCategory,
        machineSubCategory: data.machineSubCategory,
        description: data.description,
        assetCode: realAssetCode,
        isLocationPart: data.isLocationPart,
        costCenter: data.costCenter?.trim() || 'CC-MAINT-01',
        headOfDepartment: data.headOfDepartment,
        machineOwner: data.machineOwner,
        latitude: data.latitude,
        longitude: data.longitude,
        notes: data.notes,
        parentMachineId: data.parentDeviceId, // It was parentDeviceId on frontend
      },
    });

    if (data.deviceId && (data.machineType || data.machineCategory)) {
      await this.prisma.device.updateMany({
        where: { deviceId: data.deviceId },
        data: { application: data.machineType || data.machineCategory },
      }).catch(() => {});
    }

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
        machineType: data.machineType !== undefined ? data.machineType : (data.machineCategory !== undefined ? data.machineCategory : machine.machineType),
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
        costCenter: data.costCenter !== undefined ? (data.costCenter?.trim() || 'CC-MAINT-01') : undefined,
        headOfDepartment: data.headOfDepartment,
        machineOwner: data.machineOwner,
        latitude: data.latitude,
        longitude: data.longitude,
        notes: data.notes,
        parentMachineId: data.parentDeviceId,
      },
    });

    if (data.deviceId && (data.machineType || data.machineCategory)) {
      await this.prisma.device.updateMany({
        where: { deviceId: data.deviceId },
        data: { application: data.machineType || data.machineCategory },
      }).catch(() => {});
    }

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

  async getPublicMachineByCodeOrId(codeOrId: string) {
    const isNum = !isNaN(Number(codeOrId));
    let machine = await this.prisma.machine.findFirst({
      where: isNum
        ? { OR: [{ id: Number(codeOrId) }, { machineCode: codeOrId }, { serialNumber: codeOrId }] }
        : { OR: [{ machineCode: { equals: codeOrId, mode: 'insensitive' } }, { serialNumber: { equals: codeOrId, mode: 'insensitive' } }] },
      include: {
        facility: {
          include: { mainFacility: true },
        },
        building: {
          include: { society: true },
        },
        specifications: true,
        documents: true,
        checkpoints: true,
      },
    });

    if (!machine && !isNum) {
      // Fallback: search by partial name or asset code
      machine = await this.prisma.machine.findFirst({
        where: {
          OR: [
            { name: { contains: codeOrId, mode: 'insensitive' } },
            { assetCode: { contains: codeOrId, mode: 'insensitive' } },
          ],
        },
        include: {
          facility: { include: { mainFacility: true } },
          building: { include: { society: true } },
          specifications: true,
          documents: true,
          checkpoints: true,
        },
      });
    }

    if (!machine) {
      throw new NotFoundException(`Machine '${codeOrId}' not found in database`);
    }

    // Auto-seed default checkpoints if empty
    if (!machine.checkpoints || machine.checkpoints.length === 0) {
      await this.prisma.machineCheckpoint.createMany({
        data: [
          { machineId: machine.id, title: 'Emergency Stop & Guard Interlock Safety Check', checkpointType: 'SAFETY', standardValue: 'Functional / Pass', frequency: 'DAILY' },
          { machineId: machine.id, title: 'Motor & Pump Bearing Vibration & Noise Check', checkpointType: 'MECHANICAL', standardValue: '< 2.5 mm/s RMS', frequency: 'WEEKLY' },
          { machineId: machine.id, title: 'Terminal Box Voltage & Current Balance Inspection', checkpointType: 'ELECTRICAL', standardValue: '415V ± 5%, < 5% Unbalance', frequency: 'MONTHLY' },
          { machineId: machine.id, title: 'Mechanical Seal Grease & Lubrication Top-up', checkpointType: 'LUBRICATION', standardValue: 'ISO VG 46 Oil level at 75%', frequency: 'WEEKLY' },
          { machineId: machine.id, title: 'Pressure Switch Cut-in & Cut-out Differential Test', checkpointType: 'OPERATIONAL', standardValue: 'Cut-in 3.5 bar / Cut-out 5.0 bar', frequency: 'DAILY' },
        ],
      });

      // Refetch checkpoints
      const updatedCheckpoints = await this.prisma.machineCheckpoint.findMany({
        where: { machineId: machine.id },
      });
      machine.checkpoints = updatedCheckpoints;
    }

    return machine;
  }

  async getPublicMachineCheckpoints(id: number) {
    const machine = await this.prisma.machine.findUnique({
      where: { id: Number(id) },
      include: { checkpoints: true },
    });

    if (!machine) throw new NotFoundException(`Machine #${id} not found`);
    return machine.checkpoints;
  }

  async moveMachine(id: number, target: { targetType: 'facility' | 'building' | 'machine' | 'device'; targetId: number }) {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
    });
    if (!machine) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }

    if (target.targetType === 'facility') {
      const facility = await this.prisma.facility.findUnique({
        where: { id: target.targetId },
      });
      if (!facility) {
        throw new NotFoundException(`Facility with ID ${target.targetId} not found`);
      }

      return this.prisma.machine.update({
        where: { id },
        data: {
          facilityId: target.targetId,
          buildingId: null,
          parentMachineId: null,
          company: String(facility.mainFacilityId),
          isLocationPart: false,
        },
      });
    } else if (target.targetType === 'building') {
      const building = await this.prisma.building.findUnique({
        where: { id: target.targetId },
      });
      if (!building) {
        throw new NotFoundException(`Building with ID ${target.targetId} not found`);
      }

      return this.prisma.machine.update({
        where: { id },
        data: {
          buildingId: target.targetId,
          facilityId: null,
          parentMachineId: null,
          isLocationPart: false,
        },
      });
    } else if (target.targetType === 'machine' || target.targetType === 'device') {
      if (id === target.targetId) {
        throw new BadRequestException('Cannot move a machine under itself');
      }

      const targetMachine = await this.prisma.machine.findUnique({
        where: { id: target.targetId },
      });
      if (!targetMachine) {
        throw new NotFoundException(`Target machine with ID ${target.targetId} not found`);
      }

      // Check circular reference
      const isDescendant = await this.checkIsMachineDescendant(target.targetId, id);
      if (isDescendant) {
        throw new BadRequestException('Cannot move a machine under one of its own sub-machines');
      }

      return this.prisma.machine.update({
        where: { id },
        data: {
          parentMachineId: target.targetId,
          facilityId: targetMachine.facilityId,
          buildingId: targetMachine.buildingId,
          company: targetMachine.company,
          isLocationPart: true,
        },
      });
    } else {
      throw new BadRequestException(`Invalid targetType: ${target.targetType}`);
    }
  }

  private async checkIsMachineDescendant(potentialChildId: number, ancestorId: number): Promise<boolean> {
    let currentId: number | null = potentialChildId;
    const visited = new Set<number>();
    while (currentId !== null) {
      if (currentId === ancestorId) return true;
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const curr = await this.prisma.machine.findUnique({
        where: { id: currentId },
        select: { parentMachineId: true },
      });
      currentId = curr?.parentMachineId || null;
    }
    return false;
  }
}
