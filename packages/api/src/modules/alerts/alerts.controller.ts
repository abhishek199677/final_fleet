import { Controller, Get, Post, Param, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Alerts')
@ApiBearerAuth('tenant-auth')
@Controller('v1/alerts')
export class AlertsController {
  constructor(private service: AlertsService) {}

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
}
