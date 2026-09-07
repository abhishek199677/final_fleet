import { Controller, Get, Post, Put, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Users')
@ApiBearerAuth('tenant-auth')
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users in tenant' })
  findAll(@Req() req: TenantRequest) {
    return this.service.findAll(req.tenant!.tenantId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics' })
  getStats(@Req() req: TenantRequest) {
    return this.service.getStats(req.tenant!.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.service.findById(req.tenant!.tenantId, id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner')
  @ApiOperation({ summary: 'Create a new user' })
  create(@Req() req: TenantRequest, @Body() dto: { email: string; name: string; role: string }) {
    return this.service.create(req.tenant!.tenantId, dto, dto.email);
  }

  @Post('invite')
  @UseGuards(RolesGuard)
  @Roles('owner')
  @ApiOperation({ summary: 'Invite a new user (owner only)' })
  invite(@Req() req: TenantRequest, @Body() dto: { email: string; name: string; role: string }) {
    return this.service.invite(req.tenant!.tenantId, dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('owner')
  @ApiOperation({ summary: 'Update a user' })
  update(@Req() req: TenantRequest, @Param('id') id: string, @Body() dto: { name?: string; role?: string; is_active?: boolean }) {
    return this.service.update(req.tenant!.tenantId, id, dto);
  }

  @Put(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles('owner')
  @ApiOperation({ summary: 'Deactivate a user' })
  deactivate(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.service.deactivate(req.tenant!.tenantId, id);
  }

  @Put(':id/reactivate')
  @UseGuards(RolesGuard)
  @Roles('owner')
  @ApiOperation({ summary: 'Reactivate a user' })
  reactivate(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.service.reactivate(req.tenant!.tenantId, id);
  }

  @Put(':id/notification-prefs')
  @ApiOperation({ summary: 'Update own notification preferences' })
  updateNotificationPrefs(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: { notification_preferences: Record<string, boolean> }
  ) {
    return this.service.updateNotificationPrefs(req.tenant!.tenantId, id, dto.notification_preferences);
  }
}
