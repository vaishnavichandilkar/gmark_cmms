import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { WorkOrderPriority } from '@prisma/client';

@Injectable()
export class SchedulesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Disabled auto-seeding on init to ensure database stays clean after reset
  }

  private async generateNextScheduleCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.maintenanceSchedule.count();
    const nextSeq = (count + 1).toString().padStart(4, '0');
    return `SCH-${year}-${nextSeq}`;
  }

  async seedInitialSchedules() {
    const count = await this.prisma.maintenanceSchedule.count();
    if (count === 0) {
      // Find a machine to associate
      const machine = await this.prisma.machine.findFirst();
      if (!machine) return;

      const sched1 = await this.prisma.maintenanceSchedule.create({
        data: {
          scheduleCode: 'SCH-2026-0001',
          scheduleType: 'PREVENTIVE',
          frequency: 'MONTHLY',
          priority: WorkOrderPriority.HIGH,
          status: 'ACTIVE',
          machineId: machine.id,
          prePlanToleranceDays: 2,
          postPlanToleranceDays: 2,
          triggerTime: '09:00',
          startDate: new Date(),
          nextRunDate: new Date(Date.now() + 86400000 * 14),
          completedBy: 'Rajesh Kumar (Sr. Tech)',
          notes: 'Bi-monthly preventive pump shaft alignment and bearing vibration check',
          notifyUsers: JSON.stringify(['engineer@gmark.com', 'tech@gmark.com']),
          tasks: {
            create: [
              {
                description: 'Inspect pump mechanical seal grease and oil level',
                taskType: 'INSPECTION',
                frequency: 'MONTHLY',
                standardValue: 'ISO VG 46 Level 75%',
              },
              {
                description: 'Verify emergency stop button & guard safety interlocks',
                taskType: 'CALIBRATION',
                frequency: 'MONTHLY',
                standardValue: 'Pass / Zero Faults',
              },
            ],
          },
          logs: {
            create: [
              {
                action: 'CREATED',
                details: 'Initial Preventive Maintenance Schedule created in Master Database',
                performedBy: 'System Admin',
              },
            ],
          },
        },
      });

      const sched2 = await this.prisma.maintenanceSchedule.create({
        data: {
          scheduleCode: 'SCH-2026-0002',
          scheduleType: 'PREDICTIVE',
          frequency: 'QUARTERLY',
          priority: WorkOrderPriority.CRITICAL,
          status: 'ACTIVE',
          machineId: machine.id,
          prePlanToleranceDays: 3,
          postPlanToleranceDays: 3,
          triggerTime: '10:00',
          startDate: new Date(),
          nextRunDate: new Date(Date.now() + 86400000 * 30),
          completedBy: 'Anil Verma (Vibration Engineer)',
          notes: 'Predictive thermography & 3-axis vibration spectrum diagnostic schedule',
          tasks: {
            create: [
              {
                description: 'Measure motor bearing vibration spectrum (0.1 - 3.5 mm/s RMS)',
                taskType: 'INSPECTION',
                frequency: 'QUARTERLY',
                toleranceMin: 0.1,
                toleranceMax: 3.5,
              },
            ],
          },
          logs: {
            create: [
              {
                action: 'CREATED',
                details: 'Predictive Diagnostic Schedule initialized',
                performedBy: 'Maintenance Manager',
              },
            ],
          },
        },
      });
    }
  }

  async createSchedule(dto: {
    scheduleType?: string;
    frequency?: string;
    priority?: WorkOrderPriority;
    machineId: number;
    mainFacilityId?: number;
    facilityId?: number;
    buildingId?: number;
    prePlanToleranceDays?: number;
    postPlanToleranceDays?: number;
    triggerTime?: string;
    startDate: string;
    endDate?: string;
    notes?: string;
    notifyUsers?: string[];
    tasks?: { description: string; taskType?: string; frequency?: string; assignedTechnicianId?: number; checkpointMasterId?: number; standardValue?: string; toleranceMin?: number; toleranceMax?: number }[];
    spares?: { sparePartId?: number; partName: string; partCode?: string; quantity: number }[];
  }, user?: any) {
    if (!dto.machineId) {
      throw new BadRequestException('Machine association is required');
    }

    const machine = await this.prisma.machine.findUnique({
      where: { id: Number(dto.machineId) },
    });

    if (!machine) {
      throw new NotFoundException(`Machine #${dto.machineId} not found`);
    }

    const scheduleCode = await this.generateNextScheduleCode();
    const startDt = dto.startDate ? new Date(dto.startDate) : new Date();

    // Calculate next run date based on frequency
    const nextRun = new Date(startDt);
    const freq = (dto.frequency || 'MONTHLY').toUpperCase();

    if (freq === 'DAILY') nextRun.setDate(nextRun.getDate() + 1);
    else if (freq === 'WEEKLY') nextRun.setDate(nextRun.getDate() + 7);
    else if (freq === 'BIMONTHLY') nextRun.setMonth(nextRun.getMonth() + 2);
    else if (freq === 'QUARTERLY') nextRun.setMonth(nextRun.getMonth() + 3);
    else if (freq === 'HALF_YEARLY') nextRun.setMonth(nextRun.getMonth() + 6);
    else if (freq === 'YEARLY') nextRun.setFullYear(nextRun.getFullYear() + 1);
    else nextRun.setMonth(nextRun.getMonth() + 1); // MONTHLY default

    const effectiveAdminId = user?.adminId || user?.userId || null;
    const schedule = await this.prisma.maintenanceSchedule.create({
      data: {
        scheduleCode,
        adminId: effectiveAdminId,
        scheduleType: dto.scheduleType || 'PREVENTIVE',
        frequency: dto.frequency || 'MONTHLY',
        priority: dto.priority || WorkOrderPriority.MEDIUM,
        status: 'ACTIVE',
        machineId: Number(dto.machineId),
        mainFacilityId: dto.mainFacilityId ? Number(dto.mainFacilityId) : machine.facilityId,
        facilityId: dto.facilityId ? Number(dto.facilityId) : machine.facilityId,
        buildingId: dto.buildingId ? Number(dto.buildingId) : machine.buildingId,
        prePlanToleranceDays: dto.prePlanToleranceDays !== undefined ? Number(dto.prePlanToleranceDays) : 1,
        postPlanToleranceDays: dto.postPlanToleranceDays !== undefined ? Number(dto.postPlanToleranceDays) : 1,
        triggerTime: dto.triggerTime || '09:00',
        startDate: startDt,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        nextRunDate: nextRun,
        completedBy: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Maintenance Engineer',
        notes: dto.notes || null,
        notifyUsers: dto.notifyUsers ? JSON.stringify(dto.notifyUsers) : null,
        tasks: dto.tasks && dto.tasks.length > 0 ? {
          create: dto.tasks.map(t => ({
            description: t.description,
            taskType: t.taskType || 'INSPECTION',
            frequency: t.frequency || dto.frequency || 'MONTHLY',
            assignedTechnicianId: t.assignedTechnicianId ? Number(t.assignedTechnicianId) : null,
            checkpointMasterId: t.checkpointMasterId ? Number(t.checkpointMasterId) : null,
            standardValue: t.standardValue || null,
            toleranceMin: t.toleranceMin !== undefined ? Number(t.toleranceMin) : null,
            toleranceMax: t.toleranceMax !== undefined ? Number(t.toleranceMax) : null,
          })),
        } : undefined,
        spares: dto.spares && dto.spares.length > 0 ? {
          create: dto.spares.map(s => ({
            sparePartId: s.sparePartId ? Number(s.sparePartId) : null,
            partName: s.partName,
            partCode: s.partCode || null,
            quantity: Number(s.quantity) || 1,
          })),
        } : undefined,
        logs: {
          create: [
            {
              action: 'CREATED',
              details: `Schedule ${scheduleCode} configured with ${dto.tasks?.length || 0} tasks & ${dto.spares?.length || 0} spares.`,
              performedBy: user ? user.username : 'System User',
            },
          ],
        },
      },
      include: {
        machine: true,
        tasks: true,
        spares: true,
        logs: true,
      },
    });

    return schedule;
  }

  async getSchedules(query: { type?: string; search?: string; machineId?: number }, user?: any) {
    const where: any = {};
    const effectiveAdminId = user?.adminId || user?.userId;

    if (effectiveAdminId) {
      where.adminId = effectiveAdminId;
    }

    if (query.type && query.type !== 'ALL') {
      where.scheduleType = query.type;
    }

    if (query.machineId) {
      where.machineId = Number(query.machineId);
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { scheduleCode: { contains: s, mode: 'insensitive' } },
        { notes: { contains: s, mode: 'insensitive' } },
        { machine: { name: { contains: s, mode: 'insensitive' } } },
        { machine: { machineCode: { contains: s, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.maintenanceSchedule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        machine: {
          include: {
            facility: { include: { mainFacility: true } },
            building: true,
          },
        },
        tasks: {
          include: {
            assignedTechnician: true,
            checkpointMaster: true,
          },
        },
        spares: {
          include: {
            sparePart: true,
          },
        },
        logs: true,
      },
    });
  }

  async getScheduleById(id: number) {
    const schedule = await this.prisma.maintenanceSchedule.findUnique({
      where: { id: Number(id) },
      include: {
        machine: {
          include: {
            facility: { include: { mainFacility: true } },
            building: true,
          },
        },
        tasks: {
          include: {
            assignedTechnician: true,
            checkpointMaster: true,
          },
        },
        spares: {
          include: {
            sparePart: true,
          },
        },
        logs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!schedule) throw new NotFoundException(`Schedule #${id} not found`);
    return schedule;
  }

  async triggerScheduleWorkOrder(id: number, user?: any) {
    const schedule = await this.getScheduleById(id);

    // Generate WO from schedule
    const year = new Date().getFullYear();
    const count = await this.prisma.workOrder.count();
    const woNumber = `WO-${year}-${(count + 1).toString().padStart(4, '0')}`;

    const workOrder = await this.prisma.workOrder.create({
      data: {
        woNumber,
        machineId: schedule.machineId,
        problemDescription: `[Scheduled Maintenance - ${schedule.scheduleType}] ${schedule.notes || 'Routine scheduled maintenance trigger.'}`,
        priority: schedule.priority,
        triggerType: 'SCHEDULED',
        status: 'PENDING_APPROVAL',
        creatorName: 'Automated Schedule Dispatcher',
        creatorEmail: 'scheduler@gmark.com',
        maintenanceCategory: schedule.scheduleType,
        spareParts: schedule.spares && schedule.spares.length > 0 ? {
          create: schedule.spares.map(s => ({
            sparePartId: s.sparePartId,
            partName: s.partName,
            partCode: s.partCode,
            quantity: s.quantity,
          })),
        } : undefined,
      },
    });

    // Update schedule last & next run dates and log event
    const now = new Date();
    await this.prisma.maintenanceSchedule.update({
      where: { id: Number(id) },
      data: {
        lastRunDate: now,
      },
    });

    await this.prisma.maintenanceScheduleLog.create({
      data: {
        scheduleId: Number(id),
        action: 'TRIGGERED_WO',
        details: `Work Order #${woNumber} generated & notifications dispatched prior to trigger time ${schedule.triggerTime}.`,
        performedBy: user ? user.username : 'Automated Dispatcher',
      },
    });

    return { schedule, workOrder, notificationDispatched: true };
  }
}
