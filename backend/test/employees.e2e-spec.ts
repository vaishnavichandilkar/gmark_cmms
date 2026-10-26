import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Employees Master (E2E Integration Automation Tests)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let createdEmployeeId: number;

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
    if (createdEmployeeId) {
      try {
        await prisma.employee.delete({ where: { id: createdEmployeeId } });
      } catch {
        // Ignore cleanup error
      }
    }
    await app.close();
  });

  it('GET /employees - should return employees list when authenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/employees')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /employees - should reject employee creation with negative salary (400)', async () => {
    await request(app.getHttpServer())
      .post('/employees')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        employeeCode: 'EMP-E2E-NEG',
        fullName: 'Test Negative Salary',
        mobileNumber: '9998887776',
        dateOfJoining: '2026-01-01',
        dateOfBirth: '1995-05-15',
        department: 'Maintenance',
        designation: 'Technician',
        salaryPayout: -5000,
      })
      .expect(400);
  });

  it('POST /employees - should successfully create employee record', async () => {
    const uniqueSuffix = Date.now().toString().slice(-4);
    const payload = {
      employeeCode: `EMP-E2E-${uniqueSuffix}`,
      fullName: 'Aarav Patel',
      mobileNumber: '9876543210',
      officialEmail: `aarav.${uniqueSuffix}@gmark.com`,
      dateOfJoining: '2026-02-01',
      dateOfBirth: '1992-08-20',
      department: 'Electrical Engineering',
      designation: 'Senior Electrical Technician',
      salaryPayout: 45000,
      reportingTo: 'Maintenance Lead',
    };

    const res = await request(app.getHttpServer())
      .post('/employees')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.fullName).toBe('Aarav Patel');
    expect(res.body.department).toBe('Electrical Engineering');

    createdEmployeeId = res.body.id;
  });

  it('GET /employees/:id - should return single employee details', async () => {
    const res = await request(app.getHttpServer())
      .get(`/employees/${createdEmployeeId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.id).toBe(createdEmployeeId);
    expect(res.body.fullName).toBe('Aarav Patel');
  });

  it('DELETE /employees/:id - should delete employee', async () => {
    await request(app.getHttpServer())
      .delete(`/employees/${createdEmployeeId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    createdEmployeeId = 0;
  });
});
