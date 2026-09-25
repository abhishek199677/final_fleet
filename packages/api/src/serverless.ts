// Vercel serverless entry: same configuration as main.ts's bootstrap(), but
// the app is initialized in-process instead of listening on a port. The
// compiled dist/serverless.js is loaded by api/server.ts.
import './load-env';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { ProblemErrorFilter } from './common/filters/problem-error.filter';
import { requestStore } from './common/context/request-context';

type ExpressHandler = (req: Request, res: Response) => void;

let appPromise: Promise<ExpressHandler> | null = null;

async function createHandler(): Promise<ExpressHandler> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

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

  await app.init();

  return app.getHttpAdapter().getInstance() as unknown as ExpressHandler;
}

/** Cached across invocations on a warm function instance. */
export function getExpressApp(): Promise<ExpressHandler> {
  if (!appPromise) {
    appPromise = createHandler().catch((err) => {
      appPromise = null; // allow retry on next cold start after a failed boot
      throw err;
    });
  }
  return appPromise;
}
