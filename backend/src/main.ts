import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false, // Turn off CSP if it interferes with Swagger UI
  }));

  // Global DTO Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Enable CORS
  app.enableCors({
    origin: '*',
    credentials: true,
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

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Backend is running on: http://localhost:${port}`);
  logger.log(
    `📚 Swagger API Docs available at: http://localhost:${port}/api/docs`,
  );
}
bootstrap();
