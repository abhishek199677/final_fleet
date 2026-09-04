import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Audit')
@ApiBearerAuth('tenant-auth')
@Controller('audit')
@UseGuards(RolesGuard)
@Roles('owner')
export class AuditController {
  constructor(private service: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Owner audit list with filters (SEC-04)' })
  @ApiQuery({ name: 'user_id', required: false })
  @ApiQuery({ name: 'table', required: false })
  @ApiQuery({ name: 'machine_id', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  findAll(
    @Req() req: TenantRequest,
    @Query('user_id') userId?: string,
    @Query('table') table?: string,
    @Query('machine_id') machineId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll(req.tenant!.tenantId, { userId, table, machineId, from, to });
  }
}
