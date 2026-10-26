import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { WorkOrderPriority } from '@prisma/client';

describe('SchedulesService Automation Tests', () => {
  let service: SchedulesService;
  let prisma: any;

  const mockMachine = {
    id: 1,
    name: 'Primary Domestic Booster Pump #01',
    machineCode: 'MCH-HYPN-001',
    facilityId: 10,
    buildingId: 20,
  };

  const mockUser = {
    userId: 99,
    adminId: 43,
    email: 'admin@gmark.com',
    username: 'admin',
    firstName: 'System',
    lastName: 'Admin',
  };

  beforeEach(async () => {
    prisma = {
      machine: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      maintenanceSchedule: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      sparePartMaster: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
      checkpointMaster: {
        findMany: jest.fn(),
      },
      maintenanceScheduleTask: {
        deleteMany: jest.fn(),
      },
      maintenanceScheduleSpare: {
        deleteMany: jest.fn(),
      },
      maintenanceScheduleLog: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      workOrder: {
        count: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SchedulesService>(SchedulesService);
  });

  describe('createSchedule', () => {
    it('should throw BadRequestException if machineId is missing', async () => {
      await expect(service.createSchedule({ machineId: 0, startDate: '2026-10-17' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if machine does not exist in database', async () => {
      prisma.machine.findUnique.mockResolvedValue(null);

      await expect(
        service.createSchedule({ machineId: 999, startDate: '2026-10-17' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.machine.findUnique).toHaveBeenCalledWith({ where: { id: 999 } });
    });

    it('should generate collision-free scheduleCode and create schedule successfully', async () => {
      prisma.machine.findUnique.mockResolvedValue(mockMachine);
      prisma.maintenanceSchedule.findMany.mockResolvedValue([
        { scheduleCode: 'SCH-2026-0001' },
        { scheduleCode: 'SCH-2026-0004' },
      ]);
      prisma.maintenanceSchedule.findUnique.mockResolvedValue(null);
      prisma.sparePartMaster.findMany.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([]);
      prisma.checkpointMaster.findMany.mockResolvedValue([]);

      const createdSchedule = {
        id: 10,
        scheduleCode: 'SCH-2026-0005',
        machineId: 1,
        scheduleType: 'PREVENTIVE',
      };
      prisma.maintenanceSchedule.create.mockResolvedValue(createdSchedule);

      const dto = {
        machineId: 1,
        scheduleType: 'PREVENTIVE',
        frequency: 'MONTHLY',
        priority: WorkOrderPriority.HIGH,
        startDate: '2026-10-17',
        prePlanToleranceDays: 2,
        postPlanToleranceDays: 3,
        triggerTime: '09:00',
        notes: 'Routine monthly check',
      };

      const result = await service.createSchedule(dto, mockUser);

      expect(result).toEqual(createdSchedule);
      expect(prisma.maintenanceSchedule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scheduleCode: 'SCH-2026-0005',
            machineId: 1,
            mainFacilityId: 10,
            facilityId: 10,
            buildingId: 20,
            prePlanToleranceDays: 2,
            postPlanToleranceDays: 3,
            completedBy: 'System Admin',
          }),
        }),
      );
    });

    it('should safely map non-existent/mock sparePartId to null to prevent foreign key violation', async () => {
      prisma.machine.findUnique.mockResolvedValue(mockMachine);
      prisma.maintenanceSchedule.findMany.mockResolvedValue([]);
      prisma.maintenanceSchedule.findUnique.mockResolvedValue(null);
      // DB has only sparePart ID 10
      prisma.sparePartMaster.findMany.mockResolvedValue([{ id: 10 }]);
      prisma.user.findMany.mockResolvedValue([]);
      prisma.checkpointMaster.findMany.mockResolvedValue([]);

      prisma.maintenanceSchedule.create.mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data }));

      const dto = {
        machineId: 1,
        startDate: '2026-10-17',
        spares: [
          // Non-existent mock spare ID 1 (e.g. from frontend fallback)
          { sparePartId: 1, partName: 'Mock Heavy Duty Ball Bearing', partCode: 'SP-001', quantity: 2 },
          // Valid spare ID 10
          { sparePartId: 10, partName: 'Existing Pressure Switch', partCode: 'SP-010', quantity: 1 },
        ],
      };

      await service.createSchedule(dto, mockUser);

      const createCall = prisma.maintenanceSchedule.create.mock.calls[0][0];
      const sparesCreated = createCall.data.spares.create;

      expect(sparesCreated).toHaveLength(2);
      // Non-existent ID 1 must be set to null so foreign key doesn't crash
      expect(sparesCreated[0].sparePartId).toBeNull();
      expect(sparesCreated[0].partName).toBe('Mock Heavy Duty Ball Bearing');
      // Valid ID 10 must be preserved
      expect(sparesCreated[1].sparePartId).toBe(10);
    });

    it('should safely map non-existent technician and checkpointMaster IDs to null', async () => {
      prisma.machine.findUnique.mockResolvedValue(mockMachine);
      prisma.maintenanceSchedule.findMany.mockResolvedValue([]);
      prisma.maintenanceSchedule.findUnique.mockResolvedValue(null);
      prisma.sparePartMaster.findMany.mockResolvedValue([]);
      // Only user ID 50 and checkpoint ID 100 exist
      prisma.user.findMany.mockResolvedValue([{ id: 50 }]);
      prisma.checkpointMaster.findMany.mockResolvedValue([{ id: 100 }]);

      prisma.maintenanceSchedule.create.mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data }));

      const dto = {
        machineId: 1,
        startDate: '2026-10-17',
        tasks: [
          {
            description: 'Check seal and pressure',
            assignedTechnicianId: 9999, // Does not exist
            checkpointMasterId: 8888, // Does not exist
            toleranceMin: 1.5,
            toleranceMax: 4.5,
          },
          {
            description: 'Inspect vibration',
            assignedTechnicianId: 50, // Exists
            checkpointMasterId: 100, // Exists
          },
        ],
      };

      await service.createSchedule(dto, mockUser);

      const createCall = prisma.maintenanceSchedule.create.mock.calls[0][0];
      const tasksCreated = createCall.data.tasks.create;

      expect(tasksCreated).toHaveLength(2);
      expect(tasksCreated[0].assignedTechnicianId).toBeNull();
      expect(tasksCreated[0].checkpointMasterId).toBeNull();
      expect(tasksCreated[0].toleranceMin).toBe(1.5);
      expect(tasksCreated[0].toleranceMax).toBe(4.5);

      expect(tasksCreated[1].assignedTechnicianId).toBe(50);
      expect(tasksCreated[1].checkpointMasterId).toBe(100);
    });

    it('should sanitize notifyUsers array and filter empty strings', async () => {
      prisma.machine.findUnique.mockResolvedValue(mockMachine);
      prisma.maintenanceSchedule.findMany.mockResolvedValue([]);
      prisma.maintenanceSchedule.findUnique.mockResolvedValue(null);
      prisma.sparePartMaster.findMany.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([]);
      prisma.checkpointMaster.findMany.mockResolvedValue([]);

      prisma.maintenanceSchedule.create.mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data }));

      const dto = {
        machineId: 1,
        startDate: '2026-10-17',
        notifyUsers: ['admin@gmark.com', '  ', '', 'tech@gmark.com'],
      };

      await service.createSchedule(dto, mockUser);

      const createCall = prisma.maintenanceSchedule.create.mock.calls[0][0];
      expect(createCall.data.notifyUsers).toBe(JSON.stringify(['admin@gmark.com', 'tech@gmark.com']));
    });

    it('should normalize tolerance days and priority gracefully', async () => {
      prisma.machine.findUnique.mockResolvedValue(mockMachine);
      prisma.maintenanceSchedule.findMany.mockResolvedValue([]);
      prisma.maintenanceSchedule.findUnique.mockResolvedValue(null);
      prisma.sparePartMaster.findMany.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([]);
      prisma.checkpointMaster.findMany.mockResolvedValue([]);

      prisma.maintenanceSchedule.create.mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data }));

      const dto = {
        machineId: 1,
        startDate: '2026-10-17',
        priority: 'critical' as any, // Lowercase test
        prePlanToleranceDays: 'invalid' as any, // NaN test
        postPlanToleranceDays: undefined,
      };

      await service.createSchedule(dto, mockUser);

      const createCall = prisma.maintenanceSchedule.create.mock.calls[0][0];
      expect(createCall.data.priority).toBe(WorkOrderPriority.CRITICAL);
      expect(createCall.data.prePlanToleranceDays).toBe(1); // Defaulted safely
      expect(createCall.data.postPlanToleranceDays).toBe(1); // Defaulted safely
    });
  });

  describe('updateSchedule', () => {
    it('should throw NotFoundException if schedule to update does not exist', async () => {
      prisma.maintenanceSchedule.findUnique.mockResolvedValue(null);

      await expect(service.updateSchedule(404, { notes: 'New notes' }, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update schedule, delete old relations and validate new spares/tasks', async () => {
      const existingSchedule = {
        id: 5,
        scheduleCode: 'SCH-2026-0005',
        machineId: 1,
        frequency: 'MONTHLY',
        startDate: new Date('2026-10-01'),
        nextRunDate: new Date('2026-11-01'),
      };
      prisma.maintenanceSchedule.findUnique.mockResolvedValue(existingSchedule);
      prisma.maintenanceScheduleTask.deleteMany.mockResolvedValue({ count: 2 });
      prisma.maintenanceScheduleSpare.deleteMany.mockResolvedValue({ count: 1 });
      prisma.sparePartMaster.findMany.mockResolvedValue([{ id: 25 }]);
      prisma.user.findMany.mockResolvedValue([{ id: 77 }]);
      prisma.checkpointMaster.findMany.mockResolvedValue([]);

      const updatedSchedule = { ...existingSchedule, notes: 'Updated notes' };
      prisma.maintenanceSchedule.update.mockResolvedValue(updatedSchedule);

      const dto = {
        notes: 'Updated notes',
        spares: [
          { sparePartId: 25, partName: 'Audco Butterfly Valve', quantity: 1 },
          { sparePartId: 9999, partName: 'Ghost Part', quantity: 2 }, // Should be mapped to undefined/null
        ],
        tasks: [
          { description: 'Grease bearing', assignedTechnicianId: 77 },
        ],
      };

      const result = await service.updateSchedule(5, dto, mockUser);

      expect(prisma.maintenanceScheduleTask.deleteMany).toHaveBeenCalledWith({ where: { scheduleId: 5 } });
      expect(prisma.maintenanceScheduleSpare.deleteMany).toHaveBeenCalledWith({ where: { scheduleId: 5 } });
      expect(result).toEqual(updatedSchedule);

      const updateCall = prisma.maintenanceSchedule.update.mock.calls[0][0];
      expect(updateCall.data.spares.create[0].sparePartId).toBe(25);
      expect(updateCall.data.spares.create[1].sparePartId).toBeUndefined();
    });
  });

  describe('getSchedules', () => {
    it('should filter schedules by type, machineId, and adminId', async () => {
      prisma.maintenanceSchedule.findMany.mockResolvedValue([]);

      await service.getSchedules(
        { type: 'PREVENTIVE', machineId: 1, search: 'booster' },
        { adminId: 43 },
      );

      expect(prisma.maintenanceSchedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            adminId: 43,
            scheduleType: 'PREVENTIVE',
            machineId: 1,
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('triggerScheduleWorkOrder', () => {
    it('should generate WorkOrder and log TRIGGERED_WO event', async () => {
      const schedule = {
        id: 7,
        scheduleCode: 'SCH-2026-0007',
        scheduleType: 'PREVENTIVE',
        priority: WorkOrderPriority.HIGH,
        machineId: 1,
        triggerTime: '09:00',
        notes: 'Check water booster pumps',
        spares: [{ sparePartId: 1, partName: 'Filter Element', partCode: 'FLT-01', quantity: 1 }],
      };
      prisma.maintenanceSchedule.findUnique.mockResolvedValue(schedule);
      prisma.workOrder.count.mockResolvedValue(4);
      prisma.workOrder.findFirst.mockResolvedValue({ woNumber: 'WO-2026-0004' });
      prisma.workOrder.findUnique.mockResolvedValue(null);
      prisma.workOrder.create.mockResolvedValue({ id: 101, woNumber: 'WO-2026-0005' });
      prisma.maintenanceSchedule.update.mockResolvedValue(schedule);
      prisma.maintenanceScheduleLog.create.mockResolvedValue({ id: 1 });

      const result = await service.triggerScheduleWorkOrder(7, mockUser);

      expect(result.workOrder.woNumber).toBe('WO-2026-0005');
      expect(result.notificationDispatched).toBe(true);
      expect(prisma.workOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            woNumber: 'WO-2026-0005',
            machineId: 1,
            triggerType: 'SCHEDULED',
            status: 'PENDING_APPROVAL',
          }),
        }),
      );
      expect(prisma.maintenanceScheduleLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scheduleId: 7,
            action: 'TRIGGERED_WO',
          }),
        }),
      );
    });
  });

  describe('deleteSchedule', () => {
    it('should cascade delete schedule tasks, spares, logs and schedule record', async () => {
      prisma.maintenanceSchedule.findUnique.mockResolvedValue({ id: 10 });
      prisma.maintenanceScheduleTask.deleteMany.mockResolvedValue({ count: 1 });
      prisma.maintenanceScheduleSpare.deleteMany.mockResolvedValue({ count: 1 });
      prisma.maintenanceScheduleLog.deleteMany.mockResolvedValue({ count: 1 });
      prisma.maintenanceSchedule.delete.mockResolvedValue({ id: 10 });

      const res = await service.deleteSchedule(10, mockUser);

      expect(res.success).toBe(true);
      expect(prisma.maintenanceScheduleTask.deleteMany).toHaveBeenCalledWith({ where: { scheduleId: 10 } });
      expect(prisma.maintenanceScheduleSpare.deleteMany).toHaveBeenCalledWith({ where: { scheduleId: 10 } });
      expect(prisma.maintenanceScheduleLog.deleteMany).toHaveBeenCalledWith({ where: { scheduleId: 10 } });
      expect(prisma.maintenanceSchedule.delete).toHaveBeenCalledWith({ where: { id: 10 } });
    });
  });
});
