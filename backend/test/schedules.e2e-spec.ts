import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Maintenance Schedules (E2E Integration Automation Tests)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testMachineId: number;
  let createdScheduleId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Ensure a machine exists
    let machine = await prisma.machine.findFirst();
    if (!machine) {
      machine = await prisma.machine.create({
        data: {
          name: 'E2E Test Booster Pump',
          machineCode: 'E2E-MCH-001',
        },
      });
    }
    testMachineId = machine.id;

    // Generate valid JWT token using test secret
    authToken = jwt.sign(
      {
        userId: 29,
        email: 'superadmin@hypn.com',
        role: 'SUPERADMIN',
      },
      'HYPN_ACCESS_SECRET_KEY_2026',
      { expiresIn: '1h' },
    );
  });

  afterAll(async () => {
    if (createdScheduleId) {
      try {
        await prisma.maintenanceScheduleTask.deleteMany({ where: { scheduleId: createdScheduleId } });
        await prisma.maintenanceScheduleSpare.deleteMany({ where: { scheduleId: createdScheduleId } });
        await prisma.maintenanceScheduleLog.deleteMany({ where: { scheduleId: createdScheduleId } });
        await prisma.maintenanceSchedule.delete({ where: { id: createdScheduleId } });
      } catch {
        // Ignore cleanup error
      }
    }
    await app.close();
  });

  it('GET /schedules - should require authentication', async () => {
    await request(app.getHttpServer())
      .get('/schedules')
      .expect(401);
  });

  it('GET /schedules - should return schedule list when authenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/schedules')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /schedules - should return 400 when machineId is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/schedules')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        scheduleType: 'PREVENTIVE',
        frequency: 'MONTHLY',
        startDate: '2026-10-17',
      })
      .expect(400);

    expect(res.body.message).toContain('Machine association is required');
  });

  it('POST /schedules - should successfully create schedule with mock/fallback spare IDs without 500 error', async () => {
    const payload = {
      machineId: testMachineId,
      scheduleType: 'PREVENTIVE',
      frequency: 'MONTHLY',
      priority: 'HIGH',
      startDate: '2026-10-17',
      prePlanToleranceDays: 2,
      postPlanToleranceDays: 3,
      triggerTime: '09:00',
      notes: 'Automated E2E schedule test with mock spares',
      notifyUsers: ['maint.lead@gmark.com'],
      tasks: [
        {
          description: 'Inspect shaft mechanical seal and vibration',
          taskType: 'INSPECTION',
          standardValue: '< 2.5 mm/s',
        },
      ],
      spares: [
        // Using a non-existent/mock spare ID
        {
          sparePartId: 999999,
          partName: 'Mock Heavy Duty Ball Bearing 6205',
          partCode: 'SP-MOCK-999',
          quantity: 2,
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/schedules')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('scheduleCode');
    expect(res.body.scheduleCode).toMatch(/^SCH-\d{4}-\d{4}$/);
    expect(res.body.machineId).toBe(testMachineId);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.spares).toHaveLength(1);
    // Verified that non-existent foreign key was safely set to null
    expect(res.body.spares[0].sparePartId).toBeNull();
    expect(res.body.spares[0].partName).toBe('Mock Heavy Duty Ball Bearing 6205');

    createdScheduleId = res.body.id;
  });

  it('GET /schedules/:id - should return the created schedule details', async () => {
    const res = await request(app.getHttpServer())
      .get(`/schedules/${createdScheduleId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.id).toBe(createdScheduleId);
    expect(res.body.tasks).toBeDefined();
    expect(res.body.spares).toBeDefined();
  });

  it('PUT /schedules/:id - should update schedule details', async () => {
    const res = await request(app.getHttpServer())
      .put(`/schedules/${createdScheduleId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        notes: 'Updated notes via automated E2E test',
        priority: 'CRITICAL',
      })
      .expect(200);

    expect(res.body.notes).toBe('Updated notes via automated E2E test');
    expect(res.body.priority).toBe('CRITICAL');
  });

  it('POST /schedules/:id/trigger-wo - should trigger work order from schedule', async () => {
    const res = await request(app.getHttpServer())
      .post(`/schedules/${createdScheduleId}/trigger-wo`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    expect(res.body.notificationDispatched).toBe(true);
    expect(res.body.workOrder).toHaveProperty('woNumber');
    expect(res.body.workOrder.woNumber).toMatch(/^WO-\d{4}-\d{4}$/);

    // Clean up generated work order
    if (res.body.workOrder.id) {
      await prisma.workOrder.delete({ where: { id: res.body.workOrder.id } }).catch(() => {});
    }
  });

  it('DELETE /schedules/:id - should delete schedule', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/schedules/${createdScheduleId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    createdScheduleId = 0; // Prevent duplicate cleanup in afterAll
  });
});
