import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { WorkOrderPriority } from '@prisma/client';

@Injectable()
export class SchedulesService implements OnModuleInit {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Disabled auto-seeding on init to ensure database stays clean after reset
  }

  private async generateNextScheduleCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SCH-${year}-`;
    const schedules = await this.prisma.maintenanceSchedule.findMany({
      where: { scheduleCode: { startsWith: prefix } },
      select: { scheduleCode: true },
    });

    let maxNum = 0;
    for (const s of schedules) {
      const match = s.scheduleCode.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }

    let nextNum = maxNum + 1;
    let candidate = `${prefix}${nextNum.toString().padStart(4, '0')}`;
    while (await this.prisma.maintenanceSchedule.findUnique({ where: { scheduleCode: candidate } })) {
      nextNum++;
      candidate = `${prefix}${nextNum.toString().padStart(4, '0')}`;
    }
    return candidate;
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
    notifyUsers?: string[] | string;
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
    const authorName = user
      ? (`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email || 'System User')
      : 'Maintenance Engineer';

    // Normalize priority
    let priorityVal: WorkOrderPriority = WorkOrderPriority.MEDIUM;
    if (dto.priority) {
      const upper = String(dto.priority).toUpperCase() as WorkOrderPriority;
      if (Object.values(WorkOrderPriority).includes(upper)) {
        priorityVal = upper;
      }
    }

    // Normalize notifyUsers
    let notifyUsersJson: string | null = null;
    if (dto.notifyUsers) {
      if (Array.isArray(dto.notifyUsers)) {
        const cleaned = dto.notifyUsers.map(u => String(u).trim()).filter(Boolean);
        if (cleaned.length > 0) notifyUsersJson = JSON.stringify(cleaned);
      } else if (typeof dto.notifyUsers === 'string' && dto.notifyUsers.trim()) {
        notifyUsersJson = dto.notifyUsers.trim();
      }
    }

    // Validate sparePartIds to avoid foreign key violation
    let validatedSpares: { sparePartId: number | null; partName: string; partCode: string | null; quantity: number }[] | undefined = undefined;
    if (dto.spares && Array.isArray(dto.spares) && dto.spares.length > 0) {
      const validSpareIds = new Set(
        (await this.prisma.sparePartMaster.findMany({ select: { id: true } })).map(s => s.id)
      );
      validatedSpares = dto.spares
        .filter(s => s && s.partName && s.partName.trim())
        .map(s => {
          const rawId = s.sparePartId ? Number(s.sparePartId) : null;
          return {
            sparePartId: (rawId && validSpareIds.has(rawId)) ? rawId : null,
            partName: s.partName.trim(),
            partCode: s.partCode ? String(s.partCode).trim() : null,
            quantity: (!isNaN(Number(s.quantity)) && Number(s.quantity) > 0) ? Number(s.quantity) : 1,
          };
        });
    }

    // Validate tasks & foreign keys (technicians and checkpoints)
    let validatedTasks: any[] | undefined = undefined;
    if (dto.tasks && Array.isArray(dto.tasks) && dto.tasks.length > 0) {
      const validUserIds = new Set(
        (await this.prisma.user.findMany({ select: { id: true } })).map(u => u.id)
      );
      const validCheckpointIds = new Set(
        (await this.prisma.checkpointMaster.findMany({ select: { id: true } })).map(c => c.id)
      );

      validatedTasks = dto.tasks
        .filter(t => t && t.description && t.description.trim())
        .map(t => {
          const techId = t.assignedTechnicianId ? Number(t.assignedTechnicianId) : null;
          const cpId = t.checkpointMasterId ? Number(t.checkpointMasterId) : null;
          return {
            description: t.description.trim(),
            taskType: t.taskType || 'INSPECTION',
            frequency: t.frequency || dto.frequency || 'MONTHLY',
            assignedTechnicianId: (techId && validUserIds.has(techId)) ? techId : null,
            checkpointMasterId: (cpId && validCheckpointIds.has(cpId)) ? cpId : null,
            standardValue: t.standardValue || null,
            toleranceMin: (t.toleranceMin !== undefined && t.toleranceMin !== null && !isNaN(Number(t.toleranceMin))) ? Number(t.toleranceMin) : null,
            toleranceMax: (t.toleranceMax !== undefined && t.toleranceMax !== null && !isNaN(Number(t.toleranceMax))) ? Number(t.toleranceMax) : null,
          };
        });
    }

    const prePlan = (!isNaN(Number(dto.prePlanToleranceDays)) && dto.prePlanToleranceDays !== null && dto.prePlanToleranceDays !== undefined) ? Number(dto.prePlanToleranceDays) : 1;
    const postPlan = (!isNaN(Number(dto.postPlanToleranceDays)) && dto.postPlanToleranceDays !== null && dto.postPlanToleranceDays !== undefined) ? Number(dto.postPlanToleranceDays) : 1;

    try {
      const schedule = await this.prisma.maintenanceSchedule.create({
        data: {
          scheduleCode,
          adminId: effectiveAdminId,
          scheduleType: dto.scheduleType || 'PREVENTIVE',
          frequency: dto.frequency || 'MONTHLY',
          priority: priorityVal,
          status: 'ACTIVE',
          machineId: Number(dto.machineId),
          mainFacilityId: dto.mainFacilityId ? Number(dto.mainFacilityId) : machine.facilityId,
          facilityId: dto.facilityId ? Number(dto.facilityId) : machine.facilityId,
          buildingId: dto.buildingId ? Number(dto.buildingId) : machine.buildingId,
          prePlanToleranceDays: prePlan,
          postPlanToleranceDays: postPlan,
          triggerTime: dto.triggerTime || '09:00',
          startDate: startDt,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          nextRunDate: nextRun,
          completedBy: authorName,
          notes: dto.notes || null,
          notifyUsers: notifyUsersJson,
          tasks: validatedTasks && validatedTasks.length > 0 ? {
            create: validatedTasks,
          } : undefined,
          spares: validatedSpares && validatedSpares.length > 0 ? {
            create: validatedSpares,
          } : undefined,
          logs: {
            create: [
              {
                action: 'CREATED',
                details: `Schedule ${scheduleCode} configured with ${validatedTasks?.length || 0} tasks & ${validatedSpares?.length || 0} spares.`,
                performedBy: authorName,
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
    } catch (err: any) {
      this.logger.error(`Failed to create maintenance schedule: ${err.message}`, err.stack);
      throw new BadRequestException(`Failed to save maintenance schedule: ${err.message}`);
    }
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
    const prefix = `WO-${year}-`;
    const lastWO = await this.prisma.workOrder.findFirst({
      where: { woNumber: { startsWith: prefix } },
      orderBy: { woNumber: 'desc' },
      select: { woNumber: true },
    });
    let nextNum = 1;
    if (lastWO?.woNumber) {
      const match = lastWO.woNumber.match(/WO-\d{4}-(\d+)/);
      if (match && match[1]) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    while (await this.prisma.workOrder.findUnique({ where: { woNumber: `WO-${year}-${nextNum.toString().padStart(4, '0')}` } })) {
      nextNum++;
    }
    const woNumber = `WO-${year}-${nextNum.toString().padStart(4, '0')}`;

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

  async updateSchedule(id: number, dto: any, user?: any) {
    const existing = await this.getScheduleById(id);

    let nextRunDate = existing.nextRunDate;
    if (dto.startDate || dto.frequency) {
      const baseDate = dto.startDate ? new Date(dto.startDate) : new Date(existing.startDate);
      const freq = dto.frequency || existing.frequency;
      const freqDaysMap: Record<string, number> = {
        DAILY: 1,
        WEEKLY: 7,
        BIWEEKLY: 14,
        MONTHLY: 30,
        QUARTERLY: 90,
        HALFYEARLY: 180,
        ANNUAL: 365,
      };
      const days = freqDaysMap[freq] || 30;
      nextRunDate = new Date(baseDate.getTime() + days * 86400000);
    }

    const authorName = user
      ? (`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email || 'System User')
      : 'Maintenance Engineer';

    // Normalize priority if provided
    let priorityVal: WorkOrderPriority | undefined = undefined;
    if (dto.priority) {
      const upper = String(dto.priority).toUpperCase() as WorkOrderPriority;
      if (Object.values(WorkOrderPriority).includes(upper)) {
        priorityVal = upper;
      }
    }

    // Normalize notifyUsers if provided
    let notifyUsersJson: string | undefined = undefined;
    if (dto.notifyUsers !== undefined) {
      if (Array.isArray(dto.notifyUsers)) {
        const cleaned = dto.notifyUsers.map((u: any) => String(u).trim()).filter(Boolean);
        notifyUsersJson = JSON.stringify(cleaned);
      } else if (typeof dto.notifyUsers === 'string') {
        notifyUsersJson = dto.notifyUsers;
      }
    }

    try {
      if (dto.tasks && Array.isArray(dto.tasks)) {
        await this.prisma.maintenanceScheduleTask.deleteMany({
          where: { scheduleId: Number(id) },
        });
      }

      if (dto.spares && Array.isArray(dto.spares)) {
        await this.prisma.maintenanceScheduleSpare.deleteMany({
          where: { scheduleId: Number(id) },
        });
      }

      // Validate spares
      let validatedSpares: any[] | undefined = undefined;
      if (dto.spares && Array.isArray(dto.spares)) {
        const validSpareIds = new Set(
          (await this.prisma.sparePartMaster.findMany({ select: { id: true } })).map(s => s.id)
        );
        validatedSpares = dto.spares
          .filter((s: any) => s && s.partName && s.partName.trim())
          .map((s: any) => {
            const rawId = s.sparePartId ? Number(s.sparePartId) : null;
            return {
              sparePartId: (rawId && validSpareIds.has(rawId)) ? rawId : undefined,
              partName: s.partName.trim(),
              partCode: s.partCode ? String(s.partCode).trim() : undefined,
              quantity: (!isNaN(Number(s.quantity)) && Number(s.quantity) > 0) ? Number(s.quantity) : 1,
            };
          });
      }

      // Validate tasks
      let validatedTasks: any[] | undefined = undefined;
      if (dto.tasks && Array.isArray(dto.tasks)) {
        const validUserIds = new Set(
          (await this.prisma.user.findMany({ select: { id: true } })).map(u => u.id)
        );
        const validCheckpointIds = new Set(
          (await this.prisma.checkpointMaster.findMany({ select: { id: true } })).map(c => c.id)
        );

        validatedTasks = dto.tasks
          .filter((t: any) => t && t.description && t.description.trim())
          .map((t: any) => {
            const techId = t.assignedTechnicianId ? Number(t.assignedTechnicianId) : null;
            const cpId = t.checkpointMasterId ? Number(t.checkpointMasterId) : null;
            return {
              description: t.description.trim(),
              taskType: t.taskType || 'INSPECTION',
              frequency: t.frequency || dto.frequency || 'MONTHLY',
              assignedTechnicianId: (techId && validUserIds.has(techId)) ? techId : undefined,
              checkpointMasterId: (cpId && validCheckpointIds.has(cpId)) ? cpId : undefined,
              standardValue: t.standardValue || undefined,
              toleranceMin: (t.toleranceMin !== undefined && t.toleranceMin !== null && !isNaN(Number(t.toleranceMin))) ? Number(t.toleranceMin) : undefined,
              toleranceMax: (t.toleranceMax !== undefined && t.toleranceMax !== null && !isNaN(Number(t.toleranceMax))) ? Number(t.toleranceMax) : undefined,
            };
          });
      }

      const updated = await this.prisma.maintenanceSchedule.update({
        where: { id: Number(id) },
        data: {
          ...(dto.machineId && { machineId: Number(dto.machineId) }),
          ...(dto.scheduleType && { scheduleType: dto.scheduleType }),
          ...(dto.frequency && { frequency: dto.frequency }),
          ...(priorityVal && { priority: priorityVal }),
          ...(dto.status && { status: dto.status }),
          ...(dto.startDate && { startDate: new Date(dto.startDate) }),
          ...(nextRunDate && { nextRunDate }),
          ...(dto.prePlanToleranceDays !== undefined && !isNaN(Number(dto.prePlanToleranceDays)) && { prePlanToleranceDays: Number(dto.prePlanToleranceDays) }),
          ...(dto.postPlanToleranceDays !== undefined && !isNaN(Number(dto.postPlanToleranceDays)) && { postPlanToleranceDays: Number(dto.postPlanToleranceDays) }),
          ...(dto.triggerTime && { triggerTime: dto.triggerTime }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(notifyUsersJson !== undefined && { notifyUsers: notifyUsersJson }),
          ...(validatedTasks && {
            tasks: {
              create: validatedTasks,
            },
          }),
          ...(validatedSpares && {
            spares: {
              create: validatedSpares,
            },
          }),
          logs: {
            create: [
              {
                action: 'UPDATED',
                details: `Schedule updated by ${authorName}.`,
                performedBy: authorName,
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

      return updated;
    } catch (err: any) {
      this.logger.error(`Failed to update maintenance schedule #${id}: ${err.message}`, err.stack);
      throw new BadRequestException(`Failed to update maintenance schedule: ${err.message}`);
    }
  }

  async deleteSchedule(id: number, user?: any) {
    await this.getScheduleById(id);

    await this.prisma.maintenanceScheduleTask.deleteMany({
      where: { scheduleId: Number(id) },
    });
    await this.prisma.maintenanceScheduleSpare.deleteMany({
      where: { scheduleId: Number(id) },
    });
    await this.prisma.maintenanceScheduleLog.deleteMany({
      where: { scheduleId: Number(id) },
    });

    await this.prisma.maintenanceSchedule.delete({
      where: { id: Number(id) },
    });

    return { success: true, message: `Schedule #${id} deleted successfully` };
  }
}
