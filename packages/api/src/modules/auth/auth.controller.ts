import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private service: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email/password' })
  login(@Body() dto: { email: string; password: string }) {
    return this.service.login(dto.email, dto.password);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new tenant and owner user' })
  register(@Body() dto: { email: string; password: string; tenant_name: string }) {
    return this.service.register(dto.email, dto.password, dto.tenant_name);
  }
}
