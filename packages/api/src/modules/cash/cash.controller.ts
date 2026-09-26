import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CashService } from './cash.service';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Cash')
@ApiBearerAuth('tenant-auth')
@Controller('cash')
export class CashController {
  constructor(private service: CashService) {}

  @Get('accounts')
  @ApiOperation({ summary: 'List cash accounts' })
  getAccounts(@Req() req: TenantRequest) { return this.service.getAccounts(req.tenant!.tenantId); }

  @Post('accounts')
  @ApiOperation({ summary: 'Create a cash account (owner only)' })
  @UseGuards(RolesGuard)
  @Roles('owner')
  createAccount(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.createAccount(req.tenant!.tenantId, dto);
  }

  @Patch('accounts/:accountId')
  @ApiOperation({ summary: 'Edit a cash account (owner only)' })
  @UseGuards(RolesGuard)
  @Roles('owner')
  updateAccount(@Req() req: TenantRequest, @Param('accountId') accountId: string, @Body() dto: Record<string, unknown>) {
    return this.service.updateAccount(req.tenant!.tenantId, accountId, dto);
  }

  @Delete('accounts/:accountId')
  @ApiOperation({ summary: 'Delete a cash account (owner only)' })
  @UseGuards(RolesGuard)
  @Roles('owner')
  deleteAccount(@Req() req: TenantRequest, @Param('accountId') accountId: string) {
    return this.service.deleteAccount(req.tenant!.tenantId, accountId);
  }

  @Get('expected')
  @ApiOperation({ summary: 'Expected balance, last count and variance per account (owner only)' })
  @UseGuards(RolesGuard)
  @Roles('owner')
  getExpected(@Req() req: TenantRequest) { return this.service.getExpected(req.tenant!.tenantId); }

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

  @Post('counts/:countId/corrections')
  @ApiOperation({ summary: 'Correct a cash count (creates a new version)' })
  correctCount(@Req() req: TenantRequest, @Param('countId') countId: string, @Body() dto: Record<string, unknown>) {
    return this.service.correctCount(req.tenant!.tenantId, countId, dto, req.user!.id as string);
  }

  @Post('counts/:countId/void')
  @ApiOperation({ summary: 'Void a cash count with a reason (retires it from live data, keeps history)' })
  voidCount(@Req() req: TenantRequest, @Param('countId') countId: string, @Body() dto: { reason: string }) {
    return this.service.voidCount(req.tenant!.tenantId, countId, dto?.reason);
  }
}
