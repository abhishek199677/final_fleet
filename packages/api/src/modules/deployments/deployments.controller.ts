import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DeploymentsService } from './deployments.service';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Deployments')
@ApiBearerAuth('tenant-auth')
@Controller('v1/deployments')
export class DeploymentsController {
  constructor(private service: DeploymentsService) {}

  @Get()
  @ApiOperation({ summary: 'List deployments' })
  findAll(@Req() req: TenantRequest) { return this.service.findAll(req.tenant!.tenantId); }

  @Get(':id')
  @ApiOperation({ summary: 'Get deployment by ID' })
  findOne(@Req() req: TenantRequest, @Param('id') id: string) { return this.service.findById(req.tenant!.tenantId, id); }

  @Get('machine/:machineId/active')
  @ApiOperation({ summary: 'Get active deployment for a machine' })
  findActive(@Req() req: TenantRequest, @Param('machineId') machineId: string) {
    return this.service.findActiveForMachine(req.tenant!.tenantId, machineId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a deployment' })
  create(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.create(req.tenant!.tenantId, dto, dto.client_uuid as string);
  }
}
