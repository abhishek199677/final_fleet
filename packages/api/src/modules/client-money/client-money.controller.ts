import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClientMoneyService } from './client-money.service';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Client Money')
@ApiBearerAuth('tenant-auth')
@Controller('client-money')
export class ClientMoneyController {
  constructor(private service: ClientMoneyService) {}

  @Get('events')
  @ApiOperation({ summary: 'List client money events' })
  @ApiQuery({ name: 'client_id', required: false })
  getEvents(@Req() req: TenantRequest, @Query('client_id') clientId?: string) {
    return this.service.getEvents(req.tenant!.tenantId, clientId, req.tenant!.role, req.user!.id as string);
  }

  @Post('events')
  @ApiOperation({ summary: 'Create a client money event (receipt/advance/credit note)' })
  createEvent(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.createEvent(req.tenant!.tenantId, dto, dto.client_uuid as string, req.user!.id as string);
  }

  @Get('receivables')
  @ApiOperation({ summary: 'Get client receivables' })
  @UseGuards(RolesGuard)
  @Roles('owner')
  getReceivables(@Req() req: TenantRequest) {
    return this.service.getReceivables(req.tenant!.tenantId);
  }

  @Get('unused-advances')
  @ApiOperation({ summary: 'Get unused advances' })
  @UseGuards(RolesGuard)
  @Roles('owner')
  getUnusedAdvances(@Req() req: TenantRequest) {
    return this.service.getUnusedAdvances(req.tenant!.tenantId);
  }
}
