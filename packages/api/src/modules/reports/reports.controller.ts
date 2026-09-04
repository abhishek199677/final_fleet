import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Reports')
@ApiBearerAuth('tenant-auth')
@Controller('reports')
@UseGuards(RolesGuard)
@Roles('owner')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('projection-inputs')
  @ApiOperation({ summary: 'Projection defaults for this tenant (RPT-05)' })
  getInputs(@Req() req: TenantRequest) {
    return this.service.getProjectionInputs(req.tenant!.tenantId);
  }

  @Get('projections')
  @ApiOperation({ summary: 'Project billing and contribution from working days × units × rate' })
  @ApiQuery({ name: 'working_days', required: false })
  @ApiQuery({ name: 'units_per_day', required: false })
  @ApiQuery({ name: 'rate_minor', required: false })
  @ApiQuery({ name: 'currency', required: false })
  project(
    @Req() req: TenantRequest,
    @Query('working_days') workingDays?: string,
    @Query('units_per_day') unitsPerDay?: string,
    @Query('rate_minor') rateMinor?: string,
    @Query('currency') currency?: string,
  ) {
    return this.service.project(req.tenant!.tenantId, {
      workingDays: Number(workingDays) || 26,
      unitsPerDay: Number(unitsPerDay) || 8,
      rateMinor: Number(rateMinor) || 0,
      currency: currency || 'INR',
    });
  }
}
