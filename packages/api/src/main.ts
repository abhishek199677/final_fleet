import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { ProblemErrorFilter } from './common/filters/problem-error.filter';
import { requestStore } from './common/context/request-context';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env from repo root
const envPath = resolve(__dirname, '../../../.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('v1');
  app.enableCors();
  // Expose the in-flight request to database transactions so audit rows
  // record who made the change (req.user is only populated by the guard).
  app.use((req: Request, _res: Response, next: () => void) => {
    requestStore.run(req, next);
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ProblemErrorFilter());

  const config = new DocumentBuilder()
    .setTitle('Fleet OS API')
    .setDescription('Multi-tenant SaaS for heavy-equipment operators')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter Cognito JWT token',
      },
      'tenant-auth',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter Cognito platform admin token',
      },
      'platform-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Fleet OS API running on port ${port}`);
}

void bootstrap();
