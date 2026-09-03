/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';

export interface JwtPayload {
  sub: string;
  'cognito:username': string;
  'cognito:groups': string[];
  tenant_id?: string;
  role?: 'owner' | 'ops';
  iss: string;
  exp: number;
}

@Injectable()
export class TenantJwtStrategy extends PassportStrategy(Strategy, 'tenant-jwt') {
  constructor() {
    const poolId = process.env.TENANT_POOL_ID || '';
    const region = process.env.AWS_REGION || 'ap-south-1';

    const client = (jwksRsa as any)({
      jwksUri: `https://cognito-idp.${region}.amazonaws.com/${poolId}/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
    });

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer: `https://cognito-idp.${region}.amazonaws.com/${poolId}`,
      algorithms: ['RS256'],
      secretOrKeyProvider: (request: any, rawJwtToken: string, done: any) => {
        try {
          const decoded = JSON.parse(Buffer.from(rawJwtToken.split('.')[1], 'base64').toString());
          client.getSigningKey(decoded.kid, (err: any, key: any) => {
            if (err) {
              done(err);
            } else {
              done(null, key?.getPublicKey());
            }
          });
        } catch (err) {
          done(err);
        }
      },
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.tenant_id || !payload.role) {
      throw new UnauthorizedException('Missing tenant_id or role in token');
    }

    return {
      id: payload.sub,
      username: payload['cognito:username'],
      tenantId: payload.tenant_id,
      role: payload.role,
    };
  }
}
