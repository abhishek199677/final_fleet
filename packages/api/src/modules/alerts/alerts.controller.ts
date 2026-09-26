import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { AlertEngineService } from './alert-engine.service';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Alerts')
@ApiBearerAuth('tenant-auth')
@Controller('alerts')
export class AlertsController {
  constructor(
    private service: AlertsService,
    private alertEngine: AlertEngineService
  ) {}

  @Get()
  @ApiOperation({ summary: 'List alerts' })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Req() req: TenantRequest, @Query('status') status?: string) {
    return this.service.findAll(req.tenant!.tenantId, status);
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge an alert' })
  acknowledge(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.service.acknowledge(req.tenant!.tenantId, id, req.user!.id as string);
  }

  @Get('rules')
  @ApiOperation({ summary: 'List alert rules' })
  getRules(@Req() req: TenantRequest) {
    return this.service.getRules(req.tenant!.tenantId);
  }

  @Post('rules')
  @ApiOperation({ summary: 'Create an alert rule' })
  createRule(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.createRule(req.tenant!.tenantId, dto, dto.client_uuid as string);
  }

  @Patch('rules/:id')
  @ApiOperation({ summary: 'Edit an alert rule (threshold, channels, or is_active)' })
  updateRule(@Req() req: TenantRequest, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.updateRule(req.tenant!.tenantId, id, dto);
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Delete an alert rule' })
  deleteRule(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.service.deleteRule(req.tenant!.tenantId, id);
  }

  @Post('check')
  @ApiOperation({ summary: 'Run all alert checks for the tenant' })
  async runChecks(@Req() req: TenantRequest) {
    await this.alertEngine.runAllChecks(req.tenant!.tenantId);
    return { status: 'completed' };
  }
}
