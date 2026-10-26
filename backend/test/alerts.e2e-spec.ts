import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('SCADA Alerts (E2E Integration Automation Tests)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testDeviceId = 'E2E-TEST-DEV-01';
  let createdAlertId: number;

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

    // Ensure a test device exists
    let device = await prisma.device.findUnique({ where: { deviceId: testDeviceId } });
    if (!device) {
      device = await prisma.device.create({
        data: {
          deviceId: testDeviceId,
          name: 'E2E Test Telemetry Unit',
          topic: 'gmark/test/telemetry',
        },
      });
    }

    const adminUser = await prisma.user.findFirst({ where: { email: 'superadmin@hypn.com' } });
    const adminId = adminUser ? adminUser.id : 1;

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
    try {
      if (createdAlertId) {
        await prisma.deviceAlert.delete({ where: { id: createdAlertId } }).catch(() => {});
      }
      await prisma.registerAlertConfig.deleteMany({ where: { deviceId: testDeviceId } });
      await prisma.device.delete({ where: { deviceId: testDeviceId } }).catch(() => {});
    } catch {
      // Ignore cleanup error
    }
    await app.close();
  });

  it('GET /alerts/active/all - should require authentication (401)', async () => {
    await request(app.getHttpServer())
      .get('/alerts/active/all')
      .expect(401);
  });

  it('GET /alerts/active/all - should return list of active alerts when authenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/alerts/active/all')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /alerts/config/:deviceId - should save register alert configuration', async () => {
    const payload = {
      registerNumber: 15,
      registerName: 'Motor Vibration Velocity',
      alertType: 'WARNING',
      conditionType: 'GREATER_THAN',
      conditionValue: 4.5,
      message: 'Vibration velocity exceeded standard limit (4.5 mm/s)',
      intensity: 3,
      enabled: true,
    };

    const res = await request(app.getHttpServer())
      .post(`/alerts/config/${testDeviceId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.deviceId).toBe(testDeviceId);
    expect(res.body.registerNumber).toBe(15);
    expect(res.body.conditionValue).toBe(4.5);
  });

  it('GET /alerts/config/:deviceId - should retrieve configured alerts for device', async () => {
    const res = await request(app.getHttpServer())
      .get(`/alerts/config/${testDeviceId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const config = res.body.find((c: any) => c.registerNumber === 15);
    expect(config).toBeDefined();
    expect(config.conditionType).toBe('GREATER_THAN');
  });

  it('POST /alerts/:id/acknowledge - should acknowledge an active alert', async () => {
    // Create an active alert directly in DB
    const alert = await prisma.deviceAlert.create({
      data: {
        deviceId: testDeviceId,
        message: 'High current draw warning on Motor 1',
        type: 'WARNING',
        status: 'ACTIVE',
        triggerKey: 'motor1_current_overload',
      },
    });
    createdAlertId = alert.id;

    const res = await request(app.getHttpServer())
      .post(`/alerts/${alert.id}/acknowledge`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    expect(res.body.id).toBe(alert.id);
    expect(res.body.status).toBe('ACKNOWLEDGED');
    expect(res.body.resolvedAt).toBeDefined();
    expect(res.body.acknowledgedBy).toBeDefined();
  });
});
