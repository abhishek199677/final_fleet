import { Controller, Post, Body, HttpCode, HttpStatus, Get, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private service: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email/password' })
  login(@Body() dto: { email: string; password: string }) {
    return this.service.login(dto.email, dto.password);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new tenant and owner user' })
  register(@Body() dto: { email: string; password: string; tenant_name: string }) {
    return this.service.register(dto.email, dto.password, dto.tenant_name);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: { refresh_token: string }) {
    return this.service.refresh(dto.refresh_token);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  me(@Headers('authorization') auth: string) {
    const token = auth?.replace('Bearer ', '');
    if (!token) return { error: 'No token' };
    try {
      const payload = this.service.verifyToken(token);
      return {
        id: payload.sub,
        email: payload.email,
        role: payload['custom:role'],
        tenant_id: payload['custom:tenant_id'],
      };
    } catch {
      return { error: 'Invalid token' };
    }
  }
}
