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

  async getMasterCheckpoints(search?: string, type?: string) {
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
  }) {
    const cleanDesc = dto.description.trim();

    // Check if checkpoint already exists in Master Database
    let master = await this.prisma.checkpointMaster.findFirst({
      where: {
        description: { equals: cleanDesc, mode: 'insensitive' },
        checkpointType: dto.checkpointType,
      },
    });

    let isNewMasterCreated = false;

    if (!master) {
      // Create new entry in Checkpoint Master DB
      const year = new Date().getFullYear();
      const count = await this.prisma.checkpointMaster.count();
      const nextCode = `CHK-${dto.checkpointType.substring(0, 4)}-${(count + 1).toString().padStart(3, '0')}`;

      master = await this.prisma.checkpointMaster.create({
        data: {
          code: nextCode,
          checkpointType: dto.checkpointType || 'PREVENTIVE',
          description: cleanDesc,
          frequency: dto.frequency || 'MONTHLY',
          standardValue: dto.standardValue || null,
          minValue: dto.minValue !== undefined ? Number(dto.minValue) : null,
          maxValue: dto.maxValue !== undefined ? Number(dto.maxValue) : null,
          unit: dto.unit || null,
          category: dto.category || 'General',
        },
      });
      isNewMasterCreated = true;
    }

    // Save/link to User Database (UserCheckpoint table)
    const userCheckpoint = await this.prisma.userCheckpoint.create({
      data: {
        checkpointMasterId: master.id,
        machineId: Number(dto.machineId),
        userId: dto.userId ? Number(dto.userId) : null,
        checkpointType: dto.checkpointType,
        description: cleanDesc,
        frequency: dto.frequency,
        standardValue: dto.standardValue || master.standardValue,
        minValue: dto.minValue !== undefined ? Number(dto.minValue) : master.minValue,
        maxValue: dto.maxValue !== undefined ? Number(dto.maxValue) : master.maxValue,
      },
      include: {
        checkpointMaster: true,
        machine: true,
      },
    });

    return {
      userCheckpoint,
      master,
      isNewMasterCreated,
      savedToDualDatabase: isNewMasterCreated,
    };
  }

  async getUserCheckpointsByMachine(machineId: number) {
    return this.prisma.userCheckpoint.findMany({
      where: { machineId: Number(machineId) },
      include: { checkpointMaster: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
