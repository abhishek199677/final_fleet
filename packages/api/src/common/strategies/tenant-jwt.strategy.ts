import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export interface JwtPayload {
  sub: string;
  email: string;
  'custom:role'?: string;
  'custom:tenant_id'?: string;
  role?: string;
  tenant_id?: string;
  iss: string;
  exp: number;
}

@Injectable()
export class TenantJwtStrategy extends PassportStrategy(Strategy, 'tenant-jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer: 'fleetos',
      secretOrKey: JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    const tenantId = payload['custom:tenant_id'] || payload.tenant_id;
    const role = payload['custom:role'] || payload.role;

    if (!tenantId || !role) {
      throw new UnauthorizedException('Missing tenant_id or role in token');
    }

    return {
      id: payload.sub,
      email: payload.email,
      tenantId,
      role,
    };
  }
}
