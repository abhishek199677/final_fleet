import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExportService, ExportOptions } from './export.service';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Export')
@ApiBearerAuth('tenant-auth')
@Controller('export')
export class ExportController {
  constructor(private service: ExportService) {}

  @Get()
  @ApiOperation({ summary: 'Export data to Excel' })
  @ApiQuery({ name: 'type', enum: ['machines', 'billing', 'expenses', 'sessions', 'receivables'] })
  @ApiQuery({ name: 'client_id', required: false })
  @ApiQuery({ name: 'machine_id', required: false })
  @ApiQuery({ name: 'date_from', required: false })
  @ApiQuery({ name: 'date_to', required: false })
  async export(
    @Req() req: TenantRequest,
    @Query('type') type: ExportOptions['type'],
    @Query('client_id') clientId?: string,
    @Query('machine_id') machineId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.service.export(req.tenant!.tenantId, {
      type,
      client_id: clientId,
      machine_id: machineId,
      date_from: dateFrom,
      date_to: dateTo,
    });
  }
}
