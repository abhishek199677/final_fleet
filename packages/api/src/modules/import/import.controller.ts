import { Controller, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ImportService } from './import.service';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Import')
@ApiBearerAuth('tenant-auth')
@Controller('v1/import')
export class ImportController {
  constructor(private service: ImportService) {}

  @Post('machines')
  @ApiOperation({ summary: 'Import machines from CSV' })
  importMachines(@Req() req: TenantRequest, @Body() dto: { csv: string }) {
    return this.service.importMachines(req.tenant!.tenantId, dto.csv);
  }

  @Post('expenses')
  @ApiOperation({ summary: 'Import expenses from CSV' })
  importExpenses(@Req() req: TenantRequest, @Body() dto: { csv: string }) {
    return this.service.importExpenses(req.tenant!.tenantId, dto.csv);
  }

  @Post('clients')
  @ApiOperation({ summary: 'Import clients from CSV' })
  importClients(@Req() req: TenantRequest, @Body() dto: { csv: string }) {
    return this.service.importClients(req.tenant!.tenantId, dto.csv);
  }
}
