import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards, NotFoundException } from '@nestjs/common';
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
  async findOne(@Req() req: TenantRequest, @Param('id') id: string) {
    const deployment = await this.service.findById(req.tenant!.tenantId, id);
    if (!deployment) throw new NotFoundException('Deployment not found');
    return deployment;
  }

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

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('owner')
  @ApiOperation({ summary: 'Update a deployment' })
  update(@Req() req: TenantRequest, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.update(req.tenant!.tenantId, id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('owner')
  @ApiOperation({ summary: 'Delete a deployment' })
  remove(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.service.remove(req.tenant!.tenantId, id);
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
