import { Test, TestingModule } from '@nestjs/testing';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';

describe('SchedulesController Automation Tests', () => {
  let controller: SchedulesController;
  let service: any;

  const mockUser = {
    userId: 1,
    adminId: 10,
    email: 'admin@gmark.com',
  };

  beforeEach(async () => {
    service = {
      getSchedules: jest.fn(),
      createSchedule: jest.fn(),
      getScheduleById: jest.fn(),
      updateSchedule: jest.fn(),
      deleteSchedule: jest.fn(),
      triggerScheduleWorkOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulesController],
      providers: [
        {
          provide: SchedulesService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<SchedulesController>(SchedulesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSchedules', () => {
    it('should delegate to schedulesService.getSchedules with query filters and user', async () => {
      service.getSchedules.mockResolvedValue([{ id: 1, scheduleCode: 'SCH-2026-0001' }]);

      const result = await controller.getSchedules('PREVENTIVE', 'booster', 1, mockUser);

      expect(service.getSchedules).toHaveBeenCalledWith(
        { type: 'PREVENTIVE', search: 'booster', machineId: 1 },
        mockUser,
      );
      expect(result).toHaveLength(1);
      expect(result[0].scheduleCode).toBe('SCH-2026-0001');
    });
  });

  describe('createSchedule', () => {
    it('should delegate to schedulesService.createSchedule with body and user', async () => {
      const payload = { machineId: 1, startDate: '2026-10-17' };
      service.createSchedule.mockResolvedValue({ id: 2, scheduleCode: 'SCH-2026-0002' });

      const result = await controller.createSchedule(payload, mockUser);

      expect(service.createSchedule).toHaveBeenCalledWith(payload, mockUser);
      expect(result.scheduleCode).toBe('SCH-2026-0002');
    });
  });

  describe('getScheduleById', () => {
    it('should return schedule by id', async () => {
      service.getScheduleById.mockResolvedValue({ id: 5, scheduleCode: 'SCH-2026-0005' });

      const result = await controller.getScheduleById(5);

      expect(service.getScheduleById).toHaveBeenCalledWith(5);
      expect(result.id).toBe(5);
    });
  });

  describe('updateSchedule', () => {
    it('should delegate to schedulesService.updateSchedule with id, body, and user', async () => {
      const updatePayload = { notes: 'Updated notes' };
      service.updateSchedule.mockResolvedValue({ id: 5, notes: 'Updated notes' });

      const result = await controller.updateSchedule(5, updatePayload, mockUser);

      expect(service.updateSchedule).toHaveBeenCalledWith(5, updatePayload, mockUser);
      expect(result.notes).toBe('Updated notes');
    });
  });

  describe('deleteSchedule', () => {
    it('should delegate to schedulesService.deleteSchedule', async () => {
      service.deleteSchedule.mockResolvedValue({ success: true, message: 'Deleted' });

      const result = await controller.deleteSchedule(5, mockUser);

      expect(service.deleteSchedule).toHaveBeenCalledWith(5, mockUser);
      expect(result.success).toBe(true);
    });
  });

  describe('triggerWorkOrder', () => {
    it('should delegate to schedulesService.triggerScheduleWorkOrder', async () => {
      service.triggerScheduleWorkOrder.mockResolvedValue({
        schedule: { id: 5 },
        workOrder: { id: 10, woNumber: 'WO-2026-0010' },
        notificationDispatched: true,
      });

      const result = await controller.triggerWorkOrder(5, mockUser);

      expect(service.triggerScheduleWorkOrder).toHaveBeenCalledWith(5, mockUser);
      expect(result.notificationDispatched).toBe(true);
      expect(result.workOrder.woNumber).toBe('WO-2026-0010');
    });
  });
});
