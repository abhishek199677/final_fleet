import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface TenantContext {
  tenantId: string;
  role: 'owner' | 'ops' | 'platform_admin';
}

export interface TenantRequest extends Request {
  user?: Record<string, unknown>;
  tenant?: TenantContext;
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: TenantRequest, _res: Response, next: NextFunction) {
    const user = req.user;

    if (user && user.tenant_id && user.role) {
      req.tenant = {
        tenantId: user.tenant_id as string,
        role: user.role as TenantContext['role'],
      };
    }

    next();
  }
}
