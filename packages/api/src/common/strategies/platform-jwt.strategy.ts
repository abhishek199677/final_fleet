/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';

export interface PlatformJwtPayload {
  sub: string;
  'cognito:username': string;
  'cognito:groups': string[];
  role: 'platform_admin' | 'support';
  iss: string;
  exp: number;
}

@Injectable()
export class PlatformJwtStrategy extends PassportStrategy(Strategy, 'platform-jwt') {
  constructor() {
    const poolId = process.env.PLATFORM_POOL_ID || '';
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

  async validate(payload: PlatformJwtPayload) {
    if (!payload.role || !['platform_admin', 'support'].includes(payload.role)) {
      throw new UnauthorizedException('Invalid platform role');
    }

    return {
      id: payload.sub,
      username: payload['cognito:username'],
      role: payload.role,
    };
  }
}
