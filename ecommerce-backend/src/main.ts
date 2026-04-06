import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { existsSync, mkdirSync } from 'fs';
import express from 'express';
import { runtimeConfig } from './config/runtime-config';
import {
  privateUploadsDir,
  uploadsDir,
  uploadsPublicPath,
} from './common/uploads';

function resolveCorsOrigin(origin: string | undefined, allowedOrigins: string[]) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.length === 0) {
    return origin;
  }

  return allowedOrigins.includes(origin) ? origin : false;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.disable('x-powered-by');

  for (const directory of [uploadsDir, privateUploadsDir]) {
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }
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
    origin: (origin, callback) => {
      const resolvedOrigin = resolveCorsOrigin(origin, runtimeConfig.corsOrigins);

      if (!resolvedOrigin) {
        callback(new Error('Origin not allowed by CORS'));
        return;
      }

      callback(null, resolvedOrigin);
    },
    credentials: true,
  });

  app.use((_, res, next) => {
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (runtimeConfig.docsEnabled) {
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
  }

  await app.listen(runtimeConfig.port);

  console.log(`Server running on ${runtimeConfig.appUrl}`);
  if (runtimeConfig.docsEnabled) {
    console.log(`Swagger docs on ${runtimeConfig.appUrl}/${runtimeConfig.docsPath}`);
  }
}

bootstrap();
