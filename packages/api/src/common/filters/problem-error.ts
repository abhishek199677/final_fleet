import { HttpException } from '@nestjs/common';

/**
 * RFC 7807 errors with a code from @fleetos/shared errors (CLAUDE.md rule 6).
 * The ProblemErrorFilter renders { type, title, status, code, detail }.
 */
export class ProblemError extends HttpException {
  readonly code: string;

  constructor(code: string, detail: string, status = 400) {
    super({ code, message: detail }, status);
    this.code = code;
  }
}
