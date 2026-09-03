import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CashService } from './cash.service';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Cash')
@ApiBearerAuth('tenant-auth')
@Controller('v1/cash')
export class CashController {
  constructor(private service: CashService) {}

  @Get('accounts')
  @ApiOperation({ summary: 'List cash accounts' })
  getAccounts(@Req() req: TenantRequest) { return this.service.getAccounts(req.tenant!.tenantId); }

  @Get('transfers')
  @ApiOperation({ summary: 'List cash transfers' })
  getTransfers(@Req() req: TenantRequest) { return this.service.getTransfers(req.tenant!.tenantId); }

  @Post('transfers')
  @ApiOperation({ summary: 'Create a cash transfer' })
  createTransfer(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.createTransfer(req.tenant!.tenantId, dto, dto.client_uuid as string, req.user!.id as string);
  }

  @Get('accounts/:accountId/counts')
  @ApiOperation({ summary: 'List cash counts for an account' })
  getCounts(@Req() req: TenantRequest, @Param('accountId') accountId: string) {
    return this.service.getCounts(req.tenant!.tenantId, accountId);
  }

  @Post('counts')
  @ApiOperation({ summary: 'Create a cash count' })
  createCount(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.createCount(req.tenant!.tenantId, dto, dto.client_uuid as string, req.user!.id as string);
  }
}
