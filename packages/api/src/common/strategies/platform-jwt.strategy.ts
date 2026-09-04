import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

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

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer: `https://cognito-idp.${region}.amazonaws.com/${poolId}`,
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        jwksUri: `https://cognito-idp.${region}.amazonaws.com/${poolId}/.well-known/jwks.json`,
        cache: true,
        rateLimit: true,
      }),
    });
  }

  validate(payload: PlatformJwtPayload) {
    if (!payload.role || !['platform_admin', 'support'].includes(payload.role)) {
      throw new UnauthorizedException('Invalid platform role');
    }

    return Promise.resolve({
      id: payload.sub,
      username: payload['cognito:username'],
      role: payload.role,
    });
  }
}
