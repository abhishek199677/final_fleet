import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FuelDowntimeService } from './fuel-downtime.service';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Fuel & Downtime')
@ApiBearerAuth('tenant-auth')
@Controller('fuel-downtime')
export class FuelDowntimeController {
  constructor(private service: FuelDowntimeService) {}

  @Get('fuel-logs')
  @ApiOperation({ summary: 'List fuel logs' })
  @ApiQuery({ name: 'machine_id', required: false })
  getFuelLogs(@Req() req: TenantRequest, @Query('machine_id') machineId?: string) {
    return this.service.getFuelLogs(req.tenant!.tenantId, machineId);
  }

  @Post('fuel-logs')
  @ApiOperation({ summary: 'Create a fuel log' })
  createFuelLog(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.createFuelLog(req.tenant!.tenantId, dto, dto.client_uuid as string, req.user!.id as string);
  }

  @Get('downtime')
  @ApiOperation({ summary: 'List downtime segments' })
  @ApiQuery({ name: 'machine_id', required: false })
  getDowntime(@Req() req: TenantRequest, @Query('machine_id') machineId?: string) {
    return this.service.getDowntimeSegments(req.tenant!.tenantId, machineId);
  }

  @Post('downtime')
  @ApiOperation({ summary: 'Create a downtime segment' })
  createDowntime(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.createDowntimeSegment(req.tenant!.tenantId, dto, dto.client_uuid as string, req.user!.id as string);
  }
}
