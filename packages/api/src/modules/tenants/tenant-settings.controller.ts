import { Controller, Get, Put, Post, Body, Req, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Tenant Settings')
@ApiBearerAuth('tenant-auth')
@Controller('tenants')
export class TenantSettingsController {
  constructor(private service: TenantsService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Get tenant settings' })
  getSettings(@Req() req: TenantRequest) {
    return this.service.getSettings(req.tenant!.tenantId);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update tenant settings' })
  updateSettings(@Req() req: TenantRequest, @Body() updates: {
    evidence_policy?: Record<string, string>;
    fx_defaults?: Record<string, unknown>;
    cut_off_time?: string;
    working_units_per_day?: number;
    working_days_per_month?: number;
  }) {
    return this.service.updateSettings(req.tenant!.tenantId, updates);
  }

  @Post('period-close/:period')
  @ApiOperation({ summary: 'Close a billing period (owner only, BIL-07)' })
  closePeriod(@Req() req: TenantRequest, @Param('period') period: string, @Body() body: { note?: string }) {
    return this.service.closePeriod(req.tenant!.tenantId, period, req.user!.id as string, body.note);
  }

  @Get('period-closes')
  @ApiOperation({ summary: 'List closed periods' })
  listPeriodCloses(@Req() req: TenantRequest) {
    return this.service.listPeriodCloses(req.tenant!.tenantId);
  }
}
