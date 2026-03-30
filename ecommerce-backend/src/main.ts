import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { existsSync, mkdirSync } from 'fs';
import express from 'express';
import { runtimeConfig } from './config/runtime-config';
import { uploadsDir, uploadsPublicPath } from './common/uploads';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  app.setGlobalPrefix(runtimeConfig.apiPrefix);
  app.use(
    uploadsPublicPath,
    express.static(uploadsDir, {
      etag: true,
      immutable: true,
      maxAge: '30d',
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

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
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-store-id',
        in: 'header',
      },
      'x-store-id',
    )
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

  document.security = [
    {
      'x-store-id': [],
    },
  ];

  SwaggerModule.setup(runtimeConfig.docsPath, app, document);

  await app.listen(runtimeConfig.port);

  console.log(`Server running on ${runtimeConfig.appUrl}`);
  console.log(`Swagger docs on ${runtimeConfig.appUrl}/${runtimeConfig.docsPath}`);
}

bootstrap();
