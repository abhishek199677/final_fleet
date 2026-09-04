import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { API_ERROR_CODES } from './error-codes';

@Catch()
export class ProblemErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Postgres exclusion violation → overlapping work sessions (WRK-04).
    const pgCode = (exception as { code?: string })?.code;
    if (pgCode === '23P01') {
      response.status(409).json({
        type: 'about:blank',
        title: 'Conflict',
        status: 409,
        code: API_ERROR_CODES.SESSION_OVERLAP,
        detail: 'Overlapping sessions on one machine are invalid',
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const body = typeof res === 'string' ? { message: res } : (res as Record<string, unknown>);
      response.status(status).json({
        type: 'about:blank',
        title: exception.name,
        status,
        ...(typeof body.code === 'string' ? { code: body.code as string } : {}),
        detail: Array.isArray(body.message) ? (body.message as string[]).join('; ') : body.message,
      });
      return;
    }

    response.status(500).json({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred',
    });
  }
}
