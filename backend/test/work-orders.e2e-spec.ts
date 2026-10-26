import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Work Orders (E2E Integration Automation Tests)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testMachineId: number;
  let createdWorkOrderId: number;
  let testTechnicianId: number;

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

    // Find or create test machine
    let machine = await prisma.machine.findFirst();
    if (!machine) {
      machine = await prisma.machine.create({
        data: {
          name: 'E2E Test Machine WO',
          machineCode: 'E2E-MCH-WO-001',
        },
      });
    }
    testMachineId = machine.id;

    const adminUser = await prisma.user.findFirst({ where: { email: 'superadmin@hypn.com' } });
    const adminId = adminUser ? adminUser.id : 1;

    // Find a valid user to act as technician
    const user = await prisma.user.findFirst({
      where: { id: { not: adminId } },
    });
    testTechnicianId = user ? user.id : adminId;

    // Generate valid JWT token using test secret
    authToken = jwt.sign(
      {
        userId: adminId,
        email: 'superadmin@hypn.com',
        role: 'SUPER_ADMIN',
      },
      'HYPN_ACCESS_SECRET_KEY_2026',
      { expiresIn: '1h' },
    );
  });

  afterAll(async () => {
    if (createdWorkOrderId) {
      try {
        await prisma.workOrderSparePart.deleteMany({ where: { workOrderId: createdWorkOrderId } });
        await prisma.workOrderMedia.deleteMany({ where: { workOrderId: createdWorkOrderId } });
        await prisma.workOrderRevision.deleteMany({ where: { workOrderId: createdWorkOrderId } });
        await prisma.workOrder.delete({ where: { id: createdWorkOrderId } });
      } catch {
        // Ignore cleanup error
      }
    }
    await app.close();
  });

  it('GET /work-orders - should require authentication (401)', async () => {
    await request(app.getHttpServer())
      .get('/work-orders')
      .expect(401);
  });

  it('GET /work-orders - should return list of work orders when authenticated (200)', async () => {
    const res = await request(app.getHttpServer())
      .get('/work-orders')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /work-orders - should return 400 when machineId is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/work-orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        problemDescription: 'Motor bearing vibration detected',
        priority: 'HIGH',
      })
      .expect(400);

    expect(res.body.message).toContain('Machine ID is mandatory');
  });

  it('POST /work-orders - should return 400 when problemDescription is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/work-orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        machineId: testMachineId,
      })
      .expect(400);

    expect(res.body.message).toContain('Problem Description is mandatory');
  });

  it('POST /work-orders - should successfully create a new Work Order', async () => {
    const payload = {
      machineId: testMachineId,
      problemDescription: 'Automated E2E test work order for hydraulic booster pressure loss',
      priority: 'HIGH',
      triggerType: 'MANUAL',
    };

    const res = await request(app.getHttpServer())
      .post('/work-orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('woNumber');
    expect(res.body.woNumber).toMatch(/^WO-\d{4}-\d{4}$/);
    expect(res.body.status).toBe('PENDING_APPROVAL');
    expect(res.body.priority).toBe('HIGH');
    expect(res.body.machineId).toBe(testMachineId);

    createdWorkOrderId = res.body.id;
  });

  it('GET /work-orders/:id - should return work order details', async () => {
    const res = await request(app.getHttpServer())
      .get(`/work-orders/${createdWorkOrderId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.id).toBe(createdWorkOrderId);
    expect(res.body.problemDescription).toContain('Automated E2E test work order');
    expect(res.body.machine).toBeDefined();
  });

  it('POST /work-orders/:id/approve - should approve work order and assign technician', async () => {
    const res = await request(app.getHttpServer())
      .post(`/work-orders/${createdWorkOrderId}/approve`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        technicianId: testTechnicianId,
        remarks: 'Approved by Maintenance Head via Automated E2E test',
      })
      .expect(201);

    expect(res.body.status).toBe('APPROVED');
    expect(res.body.assignedTechnicianId).toBe(testTechnicianId);
  });

  it('POST /work-orders/:id/complete - should complete work order with spare parts', async () => {
    const res = await request(app.getHttpServer())
      .post(`/work-orders/${createdWorkOrderId}/complete`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        completionNotes: 'Replaced hydraulic seal and verified output pressure',
        sparePartsUsed: [
          {
            partName: 'Hydraulic Seal Ring Type-A',
            partCode: 'SP-SEAL-01',
            quantity: 2,
            unitCost: 150,
          },
        ],
      })
      .expect(201);

    expect(res.body.status).toBe('COMPLETED');
    expect(res.body.completionNotes).toContain('Replaced hydraulic seal');
    expect(res.body.completedAt).toBeDefined();
  });

  it('POST /work-orders/:id/close - should close completed work order', async () => {
    const res = await request(app.getHttpServer())
      .post(`/work-orders/${createdWorkOrderId}/close`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    expect(res.body.status).toBe('CLOSED');
    expect(res.body.closedAt).toBeDefined();
  });
});
