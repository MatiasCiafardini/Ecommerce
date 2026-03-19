import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const uploadsPath = join(process.cwd(), 'uploads');

  if (!existsSync(uploadsPath)) {
    mkdirSync(uploadsPath, { recursive: true });
  }

  // Prefijo global API
  app.setGlobalPrefix('api');
  app.use('/uploads', express.static(uploadsPath));

  // CORS para frontend
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Ecommerce API')
    .setDescription('Headless SaaS Ecommerce Backend')
    .setVersion('1.0')

    // multi-tenant header
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-store-id',
        in: 'header',
      },
      'x-store-id',
    )

    // jwt auth
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'jwt',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // 🔑 aplicar x-store-id globalmente a todos los endpoints
  document.security = [
    {
      'x-store-id': [],
    },
  ];

  SwaggerModule.setup('docs', app, document);

  await app.listen(3000);

  console.log(`🚀 Server running on http://localhost:3000`);
  console.log(`📚 Swagger docs on http://localhost:3000/docs`);
}

bootstrap();
