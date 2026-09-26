import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Maintenance')
@ApiBearerAuth('tenant-auth')
@Controller('maintenance')
export class MaintenanceController {
  constructor(private service: MaintenanceService) {}

  @Get('tasks')
  @ApiOperation({ summary: 'List maintenance tasks for the tenant (settings page)' })
  getAllTasks(@Req() req: TenantRequest) {
    return this.service.getAllTasks(req.tenant!.tenantId);
  }

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

  @Post('visits/:id/corrections')
  @ApiOperation({ summary: 'Correct a maintenance visit (creates a new version)' })
  correctVisit(@Req() req: TenantRequest, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.correctVisit(req.tenant!.tenantId, id, dto, req.user!.id as string);
  }

  @Post('visits/:id/void')
  @ApiOperation({ summary: 'Void a maintenance visit with a reason (retires it from live data, keeps history)' })
  voidVisit(@Req() req: TenantRequest, @Param('id') id: string, @Body() dto: { reason: string }) {
    return this.service.voidVisit(req.tenant!.tenantId, id, dto?.reason);
  }

  @Post('tasks')
  @ApiOperation({ summary: 'Create a maintenance task (owner only)' })
  @UseGuards(RolesGuard)
  @Roles('owner')
  createTask(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.createTask(req.tenant!.tenantId, dto, dto.client_uuid as string);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Edit a maintenance task (owner only)' })
  @UseGuards(RolesGuard)
  @Roles('owner')
  updateTask(@Req() req: TenantRequest, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.updateTask(req.tenant!.tenantId, id, dto);
  }

  @Delete('tasks/:id')
  @ApiOperation({ summary: 'Delete a maintenance task (owner only)' })
  @UseGuards(RolesGuard)
  @Roles('owner')
  deleteTask(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.service.deleteTask(req.tenant!.tenantId, id);
  }
}
