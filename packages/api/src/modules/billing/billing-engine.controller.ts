import { Controller, Get, Post, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BillingEngineService } from './billing-engine.service';
import { BillingEngine } from './billing-engine-logic';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Billing Engine')
@ApiBearerAuth('tenant-auth')
@Controller('billing')
@UseGuards(RolesGuard)
@Roles('owner')
export class BillingEngineController {
  constructor(
    private service: BillingEngineService,
    private engine: BillingEngine,
  ) {}

  @Get('rate-cards')
  @ApiOperation({ summary: 'List rate cards' })
  @ApiQuery({ name: 'deployment_id', required: false })
  getRateCards(@Req() req: TenantRequest, @Query('deployment_id') deploymentId?: string) {
    return this.service.getRateCards(req.tenant!.tenantId, deploymentId);
  }

  @Post('rate-cards')
  @ApiOperation({ summary: 'Create a rate card' })
  createRateCard(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.createRateCard(req.tenant!.tenantId, dto, dto.client_uuid as string);
  }

  @Get('extra-charges')
  @ApiOperation({ summary: 'List extra charges' })
  @ApiQuery({ name: 'deployment_id', required: false })
  getExtraCharges(@Req() req: TenantRequest, @Query('deployment_id') deploymentId?: string) {
    return this.service.getExtraCharges(req.tenant!.tenantId, deploymentId);
  }

  @Post('extra-charges')
  @ApiOperation({ summary: 'Create an extra charge' })
  createExtraCharge(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.createExtraCharge(req.tenant!.tenantId, dto, dto.client_uuid as string, req.user!.id as string);
  }

  @Get('ledger/:deploymentId')
  @ApiOperation({ summary: 'Get billing ledger for a deployment' })
  getLedger(@Req() req: TenantRequest, @Param('deploymentId') deploymentId: string) {
    return this.service.getLedger(req.tenant!.tenantId, deploymentId);
  }

  @Get('advance-consumptions')
  @ApiOperation({ summary: 'List advance consumptions' })
  @ApiQuery({ name: 'client_id', required: false })
  getAdvanceConsumptions(@Req() req: TenantRequest, @Query('client_id') clientId?: string) {
    return this.service.getAdvanceConsumptions(req.tenant!.tenantId, clientId);
  }

  @Get('kpis')
  @ApiOperation({ summary: 'Get tenant KPIs' })
  getKPIs(@Req() req: TenantRequest) {
    return this.service.getKPIs(req.tenant!.tenantId);
  }

  @Get('contribution')
  @ApiOperation({ summary: 'Get machine contribution' })
  getMachineContribution(@Req() req: TenantRequest) {
    return this.service.getMachineContribution(req.tenant!.tenantId);
  }

  @Post('run')
  @ApiOperation({ summary: 'Run the billing engine for a deployment and period (owner only)' })
  async run(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    const result = await this.engine.calculateBilling(req.tenant!.tenantId, {
      deployment_id: dto.deployment_id as string,
      period_start: dto.period_start as string,
      period_end: dto.period_end as string,
    });
    await this.engine.postBilling(req.tenant!.tenantId, result);
    return result;
  }
}
