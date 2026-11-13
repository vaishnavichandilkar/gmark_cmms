import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class CheckpointsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Disabled auto-seeding on init to ensure database stays clean after reset
  }

  async seedInitialMasterCheckpoints() {
    const count = await this.prisma.checkpointMaster.count();
    if (count === 0) {
      await this.prisma.checkpointMaster.createMany({
        data: [
          {
            code: 'CHK-PREV-001',
            checkpointType: 'PREVENTIVE',
            category: 'Safety & Interlocks',
            description: 'Emergency stop button, guard interlocks & safety relay verification',
            frequency: 'DAILY',
            standardValue: 'Functional / Pass',
          },
          {
            code: 'CHK-PRED-002',
            checkpointType: 'PREDICTIVE',
            category: 'Vibration & Mechanical',
            description: 'Motor & pump bearing tri-axial vibration spectrum analysis',
            frequency: 'MONTHLY',
            unit: 'mm/s RMS',
            minValue: 0.1,
            maxValue: 3.5,
            standardValue: '1.2 mm/s RMS',
          },
          {
            code: 'CHK-PREV-003',
            checkpointType: 'PREVENTIVE',
            category: 'Electrical & Thermography',
            description: 'Terminal box thermography scan & phase current unbalance check',
            frequency: 'QUARTERLY',
            unit: '% Unbalance',
            minValue: 0,
            maxValue: 5,
            standardValue: '< 2.5%',
          },
          {
            code: 'CHK-PRED-004',
            checkpointType: 'PREDICTIVE',
            category: 'Lubrication & Oil',
            description: 'Mechanical seal grease cleanliness & oil viscosity analysis',
            frequency: 'BIMONTHLY',
            unit: 'ISO VG',
            minValue: 40,
            maxValue: 50,
            standardValue: '46 ISO VG',
          },
          {
            code: 'CHK-PREV-005',
            checkpointType: 'PREVENTIVE',
            category: 'Pressure & Hydraulics',
            description: 'Cut-in and Cut-out pressure switch differential pressure test',
            frequency: 'WEEKLY',
            unit: 'Bar',
            minValue: 3.0,
            maxValue: 6.0,
            standardValue: 'Cut-in 3.5 bar / Cut-out 5.0 bar',
          },
        ],
      });
    }
  }

  async getMasterCheckpoints(search?: string, type?: string, currentUser?: any) {
    const isPlatformSuperAdmin = currentUser?.id === 1 || currentUser?.email === 'superadmin@hypn.com';
    const effectiveAdminId = isPlatformSuperAdmin ? null : (currentUser?.adminId || currentUser?.userId);
    const where: any = {};
    if (type) {
      where.checkpointType = type;
    }
    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { category: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (effectiveAdminId) {
      where.adminId = effectiveAdminId;
    }

    return this.prisma.checkpointMaster.findMany({
      where,
      orderBy: { code: 'asc' },
    });
  }

  // Dual Database Saving: Evaluates if checkpoint exists in Master Database.
  // If NEW: saves to both Checkpoint Master AND User Database (UserCheckpoint).
  // If EXISTING: links existing master and saves to User Database.
  async createCheckpointWithDualDatabase(dto: {
    machineId: number;
    userId?: number;
    checkpointType: string;
    description: string;
    frequency: string;
    standardValue?: string;
    minValue?: number;
    maxValue?: number;
    unit?: string;
    category?: string;
  }, currentUser?: any) {
    const cleanDesc = dto.description.trim();
    const effectiveAdminId = currentUser?.adminId || currentUser?.userId || null;
    const cpType = dto.checkpointType || 'PREVENTIVE';

    // Check if checkpoint already exists in Master Database
    let master = await this.prisma.checkpointMaster.findFirst({
      where: {
        description: { equals: cleanDesc, mode: 'insensitive' },
        checkpointType: cpType,
        ...(effectiveAdminId ? { adminId: effectiveAdminId } : {}),
      },
    });

    let isNewMasterCreated = false;

    if (!master) {
      const typePrefix = cpType.substring(0, 4).toUpperCase();
      const count = await this.prisma.checkpointMaster.count();
      let nextNum = count + 1;
      let nextCode = `CHK-${typePrefix}-${nextNum.toString().padStart(3, '0')}`;
      while (await this.prisma.checkpointMaster.findUnique({ where: { code: nextCode } })) {
        nextNum++;
        nextCode = `CHK-${typePrefix}-${nextNum.toString().padStart(3, '0')}`;
      }

      master = await this.prisma.checkpointMaster.create({
        data: {
          code: nextCode,
          adminId: effectiveAdminId,
          checkpointType: cpType,
          description: cleanDesc,
          frequency: dto.frequency || 'MONTHLY',
          standardValue: dto.standardValue || null,
          minValue: dto.minValue !== undefined && dto.minValue !== null ? Number(dto.minValue) : null,
          maxValue: dto.maxValue !== undefined && dto.maxValue !== null ? Number(dto.maxValue) : null,
          unit: dto.unit || null,
          category: dto.category || 'General',
        },
      });
      isNewMasterCreated = true;
    }

    // Check if userCheckpoint already exists to prevent duplicate entries
    let userCheckpoint = await this.prisma.userCheckpoint.findFirst({
      where: {
        machineId: Number(dto.machineId),
        description: { equals: cleanDesc, mode: 'insensitive' },
      },
      include: {
        checkpointMaster: true,
        machine: true,
      },
    });

    if (!userCheckpoint) {
      userCheckpoint = await this.prisma.userCheckpoint.create({
        data: {
          checkpointMasterId: master.id,
          machineId: Number(dto.machineId),
          userId: dto.userId ? Number(dto.userId) : null,
          checkpointType: cpType,
          description: cleanDesc,
          frequency: dto.frequency,
          standardValue: dto.standardValue || master.standardValue,
          minValue: dto.minValue !== undefined && dto.minValue !== null ? Number(dto.minValue) : master.minValue,
          maxValue: dto.maxValue !== undefined && dto.maxValue !== null ? Number(dto.maxValue) : master.maxValue,
        },
        include: {
          checkpointMaster: true,
          machine: true,
        },
      });
    }

    return {
      userCheckpoint,
      master,
      isNewMasterCreated,
      savedToDualDatabase: isNewMasterCreated,
    };
  }

  mapTaskTypeToCategory(taskType?: string): string {
    if (!taskType) return 'Safety & Mechanical';
    const upper = taskType.toUpperCase();
    if (upper === 'CLEANING') return 'Cleaning & Servicing';
    if (upper === 'LUBRICATION') return 'Lubrication & Oil';
    if (upper === 'REPLACEMENT') return 'Parts & Replacement';
    if (upper === 'CALIBRATION') return 'Calibration & Testing';
    if (upper === 'INSPECTION') return 'Safety & Mechanical';
    return taskType.charAt(0).toUpperCase() + taskType.slice(1).toLowerCase();
  }

  async getUserCheckpointsByMachine(machineId: number) {
    const mid = Number(machineId);

    // 1. Fetch existing userCheckpoints for this machine
    const existingUserCps = await this.prisma.userCheckpoint.findMany({
      where: { machineId: mid },
      include: { checkpointMaster: true },
    });

    const existingDescSet = new Set(
      existingUserCps.map(uc => (uc.description || '').trim().toLowerCase())
    );

    // 2. Find all schedules for this machine with their tasks
    const schedules = await this.prisma.maintenanceSchedule.findMany({
      where: { machineId: mid },
      include: {
        tasks: {
          include: {
            checkpointMaster: true,
          },
        },
      },
    });

    // 3. For any task in schedules that isn't already in UserCheckpoint, auto-sync it
    for (const sch of schedules) {
      if (!sch.tasks || sch.tasks.length === 0) continue;
      for (const t of sch.tasks) {
        const descClean = (t.description || '').trim();
        if (!descClean) continue;
        if (existingDescSet.has(descClean.toLowerCase())) continue;

        try {
          const type = sch.scheduleType === 'PREDICTIVE' ? 'PREDICTIVE' : 'PREVENTIVE';
          const cat = this.mapTaskTypeToCategory(t.taskType);
          const freq = t.frequency || sch.frequency || 'MONTHLY';
          await this.createCheckpointWithDualDatabase({
            machineId: mid,
            checkpointType: type,
            description: descClean,
            frequency: freq,
            standardValue: t.standardValue || undefined,
            minValue: (t.toleranceMin !== null && t.toleranceMin !== undefined) ? t.toleranceMin : undefined,
            maxValue: (t.toleranceMax !== null && t.toleranceMax !== undefined) ? t.toleranceMax : undefined,
            category: cat,
          });
          existingDescSet.add(descClean.toLowerCase());
        } catch (syncErr) {
          console.warn(`Failed to auto-sync schedule task "${descClean}" to machine #${mid}:`, syncErr);
        }
      }
    }

    // 4. Return all userCheckpoints for this machine ordered by createdAt desc
    return this.prisma.userCheckpoint.findMany({
      where: { machineId: mid },
      include: { checkpointMaster: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeUserCheckpoint(id: number) {
    const existing = await this.prisma.userCheckpoint.findUnique({
      where: { id: Number(id) },
    });

    if (existing) {
      await this.prisma.maintenanceScheduleTask.deleteMany({
        where: {
          schedule: { machineId: existing.machineId },
          description: { equals: existing.description, mode: 'insensitive' },
        },
      }).catch(err => console.warn('Could not remove schedule task on checkpoint delete', err));
    }

    return this.prisma.userCheckpoint.delete({
      where: { id: Number(id) },
    });
  }
}
