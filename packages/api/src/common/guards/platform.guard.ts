import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Platform guard for /admin/* routes (TSD §2.1): only Cognito pool B
 * identities with platform_admin or support roles. Tenant JWTs are rejected.
 */
@Injectable()
export class PlatformGuard extends AuthGuard('platform-jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = { role?: string }>(err: unknown, user: TUser | false): TUser {
    if (err || !user) throw (err as Error) || new UnauthorizedException('Platform authentication required');
    const role = (user as { role?: string }).role;
    if (!role || !['platform_admin', 'support'].includes(role)) {
      throw new UnauthorizedException('Platform role required');
    }
    return user;
  }
}
