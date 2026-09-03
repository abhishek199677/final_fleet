import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Billing')
@ApiBearerAuth('tenant-auth')
@Controller('billing')
export class BillingController {
  constructor(private service: BillingService) {}

  @Get('receivables')
  @ApiOperation({ summary: 'Get client receivables' })
  getReceivables(@Req() req: TenantRequest) { return this.service.getReceivables(req.tenant!.tenantId); }

  @Get('unused-advances')
  @ApiOperation({ summary: 'Get unused advances' })
  getUnusedAdvances(@Req() req: TenantRequest) { return this.service.getUnusedAdvances(req.tenant!.tenantId); }

  @Get('contribution')
  @ApiOperation({ summary: 'Get machine contribution' })
  getMachineContribution(@Req() req: TenantRequest) { return this.service.getMachineContribution(req.tenant!.tenantId); }

  @Get('kpis')
  @ApiOperation({ summary: 'Get tenant KPIs' })
  getKPIs(@Req() req: TenantRequest) { return this.service.getKPIs(req.tenant!.tenantId); }

  @Get('ledger/:deploymentId')
  @ApiOperation({ summary: 'Get billing ledger for a deployment' })
  getLedger(@Req() req: TenantRequest, @Param('deploymentId') deploymentId: string) {
    return this.service.getLedger(req.tenant!.tenantId, deploymentId);
  }
}
