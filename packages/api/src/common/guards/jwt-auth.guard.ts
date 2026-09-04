import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TenantRequest } from '../middleware/tenant-context.middleware';

@Injectable()
export class JwtAuthGuard extends AuthGuard('tenant-jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  // Passport has validated the JWT here, so req.user is populated.
  // TenantContextMiddleware runs before guards (req.user unset there), so the
  // tenant context must be attached here. Accepts both tenant_id and tenantId
  // claim shapes (TSD §2.2).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Unauthorized');
    }
    const req = context.switchToHttp().getRequest<TenantRequest>();
    const tenantId = (user.tenant_id ?? user.tenantId) as string | undefined;
    if (tenantId && user.role) {
      req.tenant = { tenantId, role: user.role };
    }
    return user;
  }
}
