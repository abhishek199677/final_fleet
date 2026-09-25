// MUST be the first import: it populates process.env from the repo-root .env,
// and AppModule's transitive imports (auth.service) read env at import time.
// Import declarations hoist above top-level statements, so an inline loader
// below would run too late and the API would crash on boot.
import './load-env';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { ProblemErrorFilter } from './common/filters/problem-error.filter';
import { requestStore } from './common/context/request-context';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('v1');
  app.enableCors();
  // The browser calls /v1/* directly, but the web's Next.js proxy routes
  // (/api/v1/...) and any other /api-prefixed caller would miss the `v1`
  // prefix — normalize both shapes to one before Express routes.
  app.use((req: Request, _res: Response, next: () => void) => {
    if (req.url.startsWith('/api/')) req.url = req.url.slice(4);
    next();
  });
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

  // PORT wins (pipeline/CI pin it); API_PORT is what .env documents.
  const port = process.env.PORT || process.env.API_PORT || 3001;
  try {
    await app.listen(port);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      console.error(
        `Port ${port} is already in use — another Fleet OS API instance is still running. Stop it (e.g. pkill -f "nest start") and retry.`,
      );
      process.exit(1);
    }
    throw err;
  }
  console.log(`Fleet OS API running on port ${port}`);
}

void bootstrap();
