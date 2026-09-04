import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DeploymentsService } from './deployments.service';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Deployments')
@ApiBearerAuth('tenant-auth')
@Controller('deployments')
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
  @UseGuards(RolesGuard)
  @Roles('owner')
  @ApiOperation({ summary: 'Create a deployment' })
  create(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.create(req.tenant!.tenantId, dto, dto.client_uuid as string);
  }

  @Post(':id/hold')
  @UseGuards(RolesGuard)
  @Roles('owner')
  @ApiOperation({ summary: 'Put a deployment on payment hold (owner only)' })
  hold(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.service.hold(req.tenant!.tenantId, id);
  }

  @Post(':id/release')
  @UseGuards(RolesGuard)
  @Roles('owner')
  @ApiOperation({ summary: 'Release a deployment from payment hold (owner only)' })
  release(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.service.release(req.tenant!.tenantId, id);
  }
}
