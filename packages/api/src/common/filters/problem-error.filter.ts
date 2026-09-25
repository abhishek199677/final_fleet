import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { API_ERROR_CODES } from './error-codes';

@Catch()
export class ProblemErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemErrorFilter.name);

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

    // Foreign key on tenant_id is gone (e.g. the tenant was wiped while an
    // old JWT is still stored) → tell the client to re-authenticate instead
    // of masking it as an unexpected500.
    const pgConstraint = (exception as { constraint?: string })?.constraint;
    if (pgCode === '23503' && typeof pgConstraint === 'string' && pgConstraint.includes('tenant_id')) {
      response.status(401).json({
        type: 'about:blank',
        title: 'Unauthorized',
        status: 401,
        detail: 'Your session is no longer valid. Sign out and sign in again to continue.',
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
        ...(typeof body.code === 'string' ? { code: body.code } : {}),
        detail: Array.isArray(body.message) ? (body.message as string[]).join('; ') : body.message,
      });
      return;
    }

    // Never swallow unexpected failures silently: the client still gets a
    // generic 500, but the operator gets the message, Postgres code and stack.
    const err = exception instanceof Error ? exception : null;
    const pgDetail = typeof pgCode === 'string' ? ` (postgres ${pgCode})` : '';
    this.logger.error(
      `Unhandled exception${pgDetail}: ${err ? err.message : String(exception)}`,
      err?.stack,
    );

    response.status(500).json({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred',
    });
  }
}
