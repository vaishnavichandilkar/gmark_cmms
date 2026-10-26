import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Authentication & RBAC (E2E Integration Automation Tests)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

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
    await app.close();
  });

  it('POST /auth/login - should return 401 on invalid password', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'superadmin',
        password: 'DefinitiveWrongPassword999!',
      })
      .expect(401);
  });

  it('POST /auth/login - should return 400 on empty credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({})
      .expect(400);
  });

  it('GET /auth/me - should return 401 when Authorization header is missing', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .expect(401);
  });

  it('GET /auth/me - should return current user profile when valid token provided', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe('superadmin@hypn.com');
    expect(res.body.user.role).toBe('SUPER_ADMIN');
  });

  it('PATCH /auth/module-access - should update module access setting', async () => {
    const res = await request(app.getHttpServer())
      .patch('/auth/module-access')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        moduleAccess: 'BOTH',
      })
      .expect(200);

    expect(res.body).toHaveProperty('moduleAccess');
    expect(res.body.moduleAccess).toBe('BOTH');
  });
});
