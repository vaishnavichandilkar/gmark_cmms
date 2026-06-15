import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Industrial IoT API')
    .setDescription(
      'API documentation for the Industrial IoT Monitoring Platform',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  app.enableCors();
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Backend is running on: http://localhost:${port}`);
  logger.log(
    `📚 Swagger API Docs available at: http://localhost:${port}/api/docs`,
  );
}
bootstrap();
