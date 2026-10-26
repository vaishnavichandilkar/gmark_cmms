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

  async getDropdownOptions(jwtUser: any) {
    const user = await this.prisma.user.findUnique({ 
      where: { id: jwtUser.userId },
      include: { employee: true }
    }) || jwtUser;
    const effectiveAdminId = jwtUser?.adminId || user?.adminId || user?.id || null;

    // 1. Fetch options from MachineOption table
    const storedOptions = await (this.prisma as any).machineOption.findMany({
      where: effectiveAdminId ? {
        OR: [{ adminId: effectiveAdminId }, { adminId: null }]
      } : {},
    });

    // 2. Fetch distinct values from existing Machine table
    const machines = await this.prisma.machine.findMany({
      where: effectiveAdminId ? {
        OR: [{ adminId: effectiveAdminId }, { adminId: null }]
      } : {},
      select: {
        make: true,
        modelNumber: true,
        machineCategory: true,
        machineSubCategory: true,
      }
    });

    const makes = new Set<string>(['Make 1']);
    const modelNumbers = new Set<string>(['Model 1']);
    const machineCategories = new Set<string>(['Category 1', 'HYPN', 'FIRE', 'STP', 'WTP', 'SUMP']);
    const machineSubCategories = new Set<string>(['Sub-Category 1']);

    // Add from MachineOption
    for (const opt of storedOptions) {
      if (!opt.value) continue;
      const val = opt.value.trim();
      if (!val) continue;
      if (opt.type === 'make') makes.add(val);
      else if (opt.type === 'modelNumber') modelNumbers.add(val);
      else if (opt.type === 'machineCategory') machineCategories.add(val);
      else if (opt.type === 'machineSubCategory') machineSubCategories.add(val);
    }

    // Add from existing Machines
    for (const m of machines) {
      if (m.make?.trim()) makes.add(m.make.trim());
      if (m.modelNumber?.trim()) modelNumbers.add(m.modelNumber.trim());
      if (m.machineCategory?.trim()) machineCategories.add(m.machineCategory.trim());
      if (m.machineSubCategory?.trim()) machineSubCategories.add(m.machineSubCategory.trim());
    }

    return {
      makes: Array.from(makes),
      modelNumbers: Array.from(modelNumbers),
      machineCategories: Array.from(machineCategories),
      machineSubCategories: Array.from(machineSubCategories),
    };
  }

  async addDropdownOption(body: { type: string; value: string }, jwtUser: any) {
    if (!body.type || !body.value?.trim()) {
      return { success: false };
    }
    const user = await this.prisma.user.findUnique({ 
      where: { id: jwtUser.userId },
      include: { employee: true }
    }) || jwtUser;
    const effectiveAdminId = jwtUser?.adminId || user?.adminId || user?.id || null;

    try {
      await (this.prisma as any).machineOption.upsert({
        where: {
          adminId_type_value: {
            adminId: effectiveAdminId,
            type: body.type,
            value: body.value.trim(),
          }
        },
        create: {
          adminId: effectiveAdminId,
          type: body.type,
          value: body.value.trim(),
        },
        update: {}
      });
      return { success: true, value: body.value.trim() };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async getAllMachines(jwtUser: any) {
    // Fetch latest user data from DB to ensure we have mainFacilityId which might be missing in older JWTs
    const user = await this.prisma.user.findUnique({ 
      where: { id: jwtUser.userId },
      include: { employee: true }
    }) || jwtUser;

    const effectiveAdminId = jwtUser?.adminId || user?.adminId || user?.id;
    let whereClause: any = {};

    if (effectiveAdminId) {
      whereClause.adminId = effectiveAdminId;
    }

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
    } else if (user.role !== 'SUPER_ADMIN') {
      const orConditions: any[] = [];
      if (user.employee) {
        orConditions.push({ machineOwner: user.employee.fullName });
        orConditions.push({ maintenanceHead: user.employee.fullName });
      }
      if (jwtUser.buildingIds && jwtUser.buildingIds.length > 0) {
        orConditions.push({ buildingId: { in: jwtUser.buildingIds } });
      }
      if (orConditions.length > 0) {
        whereClause.OR = orConditions;
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

  async create(data: any, jwtUser?: any) {
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

    const effectiveAdminId = jwtUser?.adminId || jwtUser?.userId || null;

    const machine = await this.prisma.machine.create({
      data: {
        name: data.name,
        adminId: effectiveAdminId,
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

    // Persist options for dropdowns
    const optionsToSave = [
      { type: 'make', value: data.make },
      { type: 'modelNumber', value: data.modelNumber },
      { type: 'machineCategory', value: data.machineCategory },
      { type: 'machineSubCategory', value: data.machineSubCategory },
    ];
    for (const opt of optionsToSave) {
      if (opt.value && typeof opt.value === 'string' && opt.value.trim()) {
        await (this.prisma as any).machineOption.upsert({
          where: {
            adminId_type_value: {
              adminId: effectiveAdminId,
              type: opt.type,
              value: opt.value.trim(),
            }
          },
          create: {
            adminId: effectiveAdminId,
            type: opt.type,
            value: opt.value.trim(),
          },
          update: {}
        }).catch(() => {});
      }
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

    // Persist options for dropdowns
    const effectiveAdminId = machine.adminId;
    const optionsToSave = [
      { type: 'make', value: data.make },
      { type: 'modelNumber', value: data.modelNumber },
      { type: 'machineCategory', value: data.machineCategory },
      { type: 'machineSubCategory', value: data.machineSubCategory },
    ];
    for (const opt of optionsToSave) {
      if (opt.value && typeof opt.value === 'string' && opt.value.trim()) {
        await (this.prisma as any).machineOption.upsert({
          where: {
            adminId_type_value: {
              adminId: effectiveAdminId,
              type: opt.type,
              value: opt.value.trim(),
            }
          },
          create: {
            adminId: effectiveAdminId,
            type: opt.type,
            value: opt.value.trim(),
          },
          update: {}
        }).catch(() => {});
      }
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

  async moveMachine(id: number, target: { targetType: 'facility' | 'building' | 'machine' | 'device' | 'mainFacility' | 'society'; targetId: number }) {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
      include: {
        specifications: true,
        documents: true,
        checkpoints: true,
        workOrders: true,
        maintenanceSchedules: true,
        childMachines: true,
      },
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

      // Resolve mainFacilityId up the facility hierarchy if direct parent is nested
      let resolvedMainFacilityId = facility.mainFacilityId;
      if (!resolvedMainFacilityId && facility.parentFacilityId) {
        let parentId: number | null = facility.parentFacilityId;
        while (parentId && !resolvedMainFacilityId) {
          const parentFac: any = await this.prisma.facility.findUnique({ where: { id: parentId } });
          if (!parentFac) break;
          resolvedMainFacilityId = parentFac.mainFacilityId;
          parentId = parentFac.parentFacilityId;
        }
      }

      const updatedMachine = await this.prisma.machine.update({
        where: { id },
        data: {
          facilityId: target.targetId,
          buildingId: null,
          parentMachineId: null,
          company: resolvedMainFacilityId ? String(resolvedMainFacilityId) : machine.company,
          isLocationPart: false,
        },
        include: {
          specifications: true,
          documents: true,
          checkpoints: true,
          workOrders: true,
          maintenanceSchedules: true,
          childMachines: true,
        },
      });

      // Update maintenance schedules linked to this machine
      await this.prisma.maintenanceSchedule.updateMany({
        where: { machineId: id },
        data: {
          facilityId: target.targetId,
          mainFacilityId: resolvedMainFacilityId || null,
          buildingId: null,
        },
      });

      return updatedMachine;
    } else if (target.targetType === 'mainFacility') {
      const mainFacility = await this.prisma.mainFacility.findUnique({
        where: { id: target.targetId },
      });
      if (!mainFacility) {
        throw new NotFoundException(`Main Facility with ID ${target.targetId} not found`);
      }

      const updatedMachine = await this.prisma.machine.update({
        where: { id },
        data: {
          facilityId: null,
          buildingId: null,
          parentMachineId: null,
          company: String(mainFacility.id),
          isLocationPart: false,
        },
        include: {
          specifications: true,
          documents: true,
          checkpoints: true,
          workOrders: true,
          maintenanceSchedules: true,
          childMachines: true,
        },
      });

      // Update maintenance schedules linked to this machine
      await this.prisma.maintenanceSchedule.updateMany({
        where: { machineId: id },
        data: {
          facilityId: null,
          mainFacilityId: target.targetId,
          buildingId: null,
        },
      });

      return updatedMachine;
    } else if (target.targetType === 'building') {
      const building = await this.prisma.building.findUnique({
        where: { id: target.targetId },
      });
      if (!building) {
        throw new NotFoundException(`Building with ID ${target.targetId} not found`);
      }

      const updatedMachine = await this.prisma.machine.update({
        where: { id },
        data: {
          buildingId: target.targetId,
          facilityId: null,
          parentMachineId: null,
          isLocationPart: false,
        },
        include: {
          specifications: true,
          documents: true,
          checkpoints: true,
          workOrders: true,
          maintenanceSchedules: true,
          childMachines: true,
        },
      });

      await this.prisma.maintenanceSchedule.updateMany({
        where: { machineId: id },
        data: {
          buildingId: target.targetId,
          facilityId: null,
          mainFacilityId: null,
        },
      });

      if (machine.deviceId) {
        await this.prisma.device.updateMany({
          where: { deviceId: machine.deviceId },
          data: { buildingId: target.targetId },
        }).catch(() => {});
      }

      return updatedMachine;
    } else if (target.targetType === 'society') {
      const society = await this.prisma.society.findUnique({
        where: { id: target.targetId },
        include: { buildings: true },
      });
      if (!society) {
        throw new NotFoundException(`Society with ID ${target.targetId} not found`);
      }

      const targetBuildingId = society.buildings?.[0]?.id || null;

      const updatedMachine = await this.prisma.machine.update({
        where: { id },
        data: {
          buildingId: targetBuildingId,
          facilityId: null,
          parentMachineId: null,
          company: society.name,
          isLocationPart: false,
        },
        include: {
          specifications: true,
          documents: true,
          checkpoints: true,
          workOrders: true,
          maintenanceSchedules: true,
          childMachines: true,
        },
      });

      await this.prisma.maintenanceSchedule.updateMany({
        where: { machineId: id },
        data: {
          buildingId: targetBuildingId,
          facilityId: null,
          mainFacilityId: null,
        },
      });

      return updatedMachine;
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

      const updatedMachine = await this.prisma.machine.update({
        where: { id },
        data: {
          parentMachineId: target.targetId,
          facilityId: targetMachine.facilityId,
          buildingId: targetMachine.buildingId,
          company: targetMachine.company,
          isLocationPart: true,
        },
        include: {
          specifications: true,
          documents: true,
          checkpoints: true,
          workOrders: true,
          maintenanceSchedules: true,
          childMachines: true,
        },
      });

      await this.prisma.maintenanceSchedule.updateMany({
        where: { machineId: id },
        data: {
          facilityId: targetMachine.facilityId,
          buildingId: targetMachine.buildingId,
          mainFacilityId: targetMachine.company ? Number(targetMachine.company) || null : null,
        },
      });

      return updatedMachine;
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

  async getMachineUsers(machineId: number) {
    const machine = await this.prisma.machine.findUnique({
      where: { id: machineId },
      include: { facility: true },
    });
    if (!machine) {
      throw new NotFoundException(`Machine #${machineId} not found`);
    }

    const identifiers = [
      machine.deviceId,
      machine.machineCode,
      String(machine.id),
    ].filter(Boolean) as string[];

    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { deviceId: { in: identifiers } },
          ...(machine.name ? [{ deviceName: machine.name }] : []),
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        designation: true,
        employeeId: true,
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeCode: true,
            department: true,
          },
        },
      },
    });

    return users;
  }

  async assignMachineUsers(machineId: number, userIds: number[]) {
    const machine = await this.prisma.machine.findUnique({
      where: { id: machineId },
      include: { facility: true },
    });
    if (!machine) {
      throw new NotFoundException(`Machine #${machineId} not found`);
    }

    const targetUserIds = Array.isArray(userIds) ? userIds.map(Number) : [];
    const deviceIdentifier = machine.deviceId || machine.machineCode || `machine-${machine.id}`;

    return this.prisma.$transaction(async (tx) => {
      // 1. Unassign users previously attached to this machine who are not in targetUserIds
      await tx.user.updateMany({
        where: {
          OR: [
            { deviceId: deviceIdentifier },
            ...(machine.deviceId ? [{ deviceId: machine.deviceId }] : []),
            ...(machine.machineCode ? [{ deviceId: machine.machineCode }] : []),
          ],
          id: { notIn: targetUserIds },
        },
        data: {
          deviceId: null,
          deviceName: null,
        },
      });

      // 2. Assign target users to this machine
      if (targetUserIds.length > 0) {
        await tx.user.updateMany({
          where: {
            id: { in: targetUserIds },
          },
          data: {
            deviceId: deviceIdentifier,
            deviceName: machine.name,
            facilityId: machine.facilityId || undefined,
          },
        });
      }

      return {
        success: true,
        machineId,
        assignedUserCount: targetUserIds.length,
      };
    });
  }
}
