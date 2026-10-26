import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Machines & Assets Master (E2E Integration Automation Tests)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let createdMachineId: number;

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

    const adminUser = await prisma.user.findFirst({ where: { email: 'superadmin@hypn.com' } });
    const adminId = adminUser ? adminUser.id : 1;

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
    if (createdMachineId) {
      try {
        await prisma.machineCheckpoint.deleteMany({ where: { machineId: createdMachineId } });
        await prisma.machineSpecification.deleteMany({ where: { machineId: createdMachineId } });
        await prisma.machineDocument.deleteMany({ where: { machineId: createdMachineId } });
        await prisma.machine.delete({ where: { id: createdMachineId } });
      } catch {
        // Ignore cleanup error
      }
    }
    await app.close();
  });

  it('GET /machines/next-machine-code - should return next auto-generated machine code preview', async () => {
    const res = await request(app.getHttpServer())
      .get('/machines/next-machine-code')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(typeof res.body).toBe('object');
  });

  it('GET /machines/next-asset-code - should return next auto-generated asset code preview', async () => {
    const res = await request(app.getHttpServer())
      .get('/machines/next-asset-code')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(typeof res.body).toBe('object');
  });

  it('GET /machines - should return all machines list when authenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/machines')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /machines - should create a new machine asset with specifications', async () => {
    const payload = {
      name: 'E2E Test Submersible Sump Pump',
      machineCode: 'E2E-MCH-SMP-099',
      machineType: 'SUMP',
      make: 'Grundfos',
      modelNumber: 'SP-14A-10',
      description: 'Automated test machine entity for sump pit drainage',
      specifications: [
        {
          title: 'Motor Rating',
          inputType: 'text',
          data: '7.5',
          unit: 'kW',
        },
      ],
      checkpoints: [
        {
          title: 'Inspect Impeller Clogging',
          checkpointType: 'MECHANICAL',
          standardValue: 'No debris',
          frequency: 'MONTHLY',
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/machines')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('E2E Test Submersible Sump Pump');
    expect(res.body.machineCode).toBe('E2E-MCH-SMP-099');

    createdMachineId = res.body.id;
  });

  it('GET /machines/:id - should return machine details with specs & checkpoints', async () => {
    const res = await request(app.getHttpServer())
      .get(`/machines/${createdMachineId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.id).toBe(createdMachineId);
    expect(res.body.name).toBe('E2E Test Submersible Sump Pump');
  });

  it('PUT /machines/:id - should update machine information', async () => {
    const res = await request(app.getHttpServer())
      .put(`/machines/${createdMachineId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        notes: 'Updated via Automated E2E integration test',
      })
      .expect(200);

    expect(res.body.notes).toBe('Updated via Automated E2E integration test');
  });
});
