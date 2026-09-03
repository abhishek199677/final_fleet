import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Maintenance')
@ApiBearerAuth('tenant-auth')
@Controller('maintenance')
export class MaintenanceController {
  constructor(private service: MaintenanceService) {}

  @Get('machines/:machineId/tasks')
  @ApiOperation({ summary: 'Get maintenance tasks for a machine' })
  getTasks(@Req() req: TenantRequest, @Param('machineId') machineId: string) {
    return this.service.getTasks(req.tenant!.tenantId, machineId);
  }

  @Get('machines/:machineId/status')
  @ApiOperation({ summary: 'Get maintenance status for a machine' })
  getStatus(@Req() req: TenantRequest, @Param('machineId') machineId: string) {
    return this.service.getStatus(req.tenant!.tenantId, machineId);
  }

  @Get('machines/:machineId/visits')
  @ApiOperation({ summary: 'Get maintenance visits for a machine' })
  getVisits(@Req() req: TenantRequest, @Param('machineId') machineId: string) {
    return this.service.getVisits(req.tenant!.tenantId, machineId);
  }

  @Post('visits')
  @ApiOperation({ summary: 'Create a maintenance visit' })
  createVisit(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.createVisit(req.tenant!.tenantId, dto, dto.client_uuid as string, req.user!.id as string);
  }
}
