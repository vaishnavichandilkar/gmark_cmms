try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch (_) {
  // .env may not exist in container/production or already loaded
}

// Guard against unhandled third-party background connection drops (e.g. MQTT connack timeout)
process.on('uncaughtException', (err: any) => {
  console.error('[Process] Uncaught Exception caught safely:', err?.message || err);
});
process.on('unhandledRejection', (reason: any) => {
  console.warn('[Process] Unhandled Rejection caught safely:', reason?.message || reason);
});

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  if (process.env.DATABASE_URL && process.env.SKIP_DB_INIT !== 'true') {
    try {
      const initScriptPath = path.join(process.cwd(), 'scripts', 'init-production-db.js');
      if (fs.existsSync(initScriptPath)) {
        const initDb = require(initScriptPath);
        if (typeof initDb === 'function') {
          await initDb();
        }
      }
    } catch (e: any) {
      console.warn('[Bootstrap] Database auto-init warning:', e?.message);
    }
  }

  const app = await NestFactory.create(AppModule);

  // Increase payload limit for file/image uploads
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Turn off CSP if it interferes with Swagger UI
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Global DTO Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable CORS with dynamic origin reflection to support credentials
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server) or any client origin
      callback(null, true);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
  });

  const config = new DocumentBuilder()
    .setTitle('Industrial IoT API')
    .setDescription(
      'API documentation for the Industrial IoT Monitoring Platform (HYPN)',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3002;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Backend is running on: http://localhost:${port}`);
  logger.log(
    `📚 Swagger API Docs available at: http://localhost:${port}/api/docs`,
  );
}
bootstrap();
