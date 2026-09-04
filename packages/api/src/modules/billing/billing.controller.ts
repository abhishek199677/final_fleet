import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Billing')
@ApiBearerAuth('tenant-auth')
@Controller('billing')
@UseGuards(RolesGuard)
@Roles('owner')
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
}
