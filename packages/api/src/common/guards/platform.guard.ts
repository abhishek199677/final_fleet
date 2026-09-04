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

  handleRequest(err: unknown, user: { role?: string } | false) {
    if (err || !user) throw err || new UnauthorizedException('Platform authentication required');
    if (!user.role || !['platform_admin', 'support'].includes(user.role)) {
      throw new UnauthorizedException('Platform role required');
    }
    return user;
  }
}
