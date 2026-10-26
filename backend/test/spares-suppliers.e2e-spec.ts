import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Spare Parts & Suppliers Master (E2E Integration Automation Tests)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let createdSupplierId: number;
  let testSparePartId: number;

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

    // Find or create test spare part with adminId
    let spare = await prisma.sparePartMaster.findUnique({ where: { partCode: 'SP-E2E-TST-01' } });
    if (!spare) {
      spare = await prisma.sparePartMaster.create({
        data: {
          partCode: 'SP-E2E-TST-01',
          partName: 'E2E Test Mechanical Seal',
          stockQuantity: 50,
          unitCost: 1200,
          adminId,
        },
      });
    } else if (spare.adminId !== adminId) {
      spare = await prisma.sparePartMaster.update({
        where: { id: spare.id },
        data: { adminId },
      });
    }
    testSparePartId = spare.id;

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
    if (createdSupplierId) {
      try {
        await prisma.supplier.delete({ where: { id: createdSupplierId } });
      } catch {
        // Ignore cleanup error
      }
    }
    await app.close();
  });

  it('GET /spare-parts - should return list of spare parts', async () => {
    const res = await request(app.getHttpServer())
      .get('/spare-parts')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('PUT /spare-parts/:id - should update spare part inventory stock', async () => {
    const res = await request(app.getHttpServer())
      .put(`/spare-parts/${testSparePartId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        stockQuantity: 75,
        location: 'Bin E2E-99',
      })
      .expect(200);

    expect(res.body.stockQuantity).toBe(75);
    expect(res.body.location).toBe('Bin E2E-99');
  });

  it('GET /suppliers/next-code - should return next auto-generated supplier code', async () => {
    const res = await request(app.getHttpServer())
      .get('/suppliers/next-code')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(typeof res.body).toBe('object');
  });

  it('POST /suppliers - should create a new supplier record', async () => {
    const payload = {
      name: 'Apex Industrial Spares Pvt Ltd',
      contactPerson: 'Mr. Rajesh Verma',
      email: 'rajesh.verma@apexspares.com',
      phone: '9876543210',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      businessCategory: 'Pumps & Bearings Supplier',
    };

    const res = await request(app.getHttpServer())
      .post('/suppliers')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Apex Industrial Spares Pvt Ltd');
    expect(res.body.email).toBe('rajesh.verma@apexspares.com');

    createdSupplierId = res.body.id;
  });

  it('GET /suppliers - should find suppliers with search parameter', async () => {
    const res = await request(app.getHttpServer())
      .get('/suppliers?search=Apex')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.some((s: any) => s.id === createdSupplierId);
    expect(found).toBe(true);
  });

  it('DELETE /suppliers/:id - should delete supplier record', async () => {
    await request(app.getHttpServer())
      .delete(`/suppliers/${createdSupplierId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    createdSupplierId = 0;
  });
});
