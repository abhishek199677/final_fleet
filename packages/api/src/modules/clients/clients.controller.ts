import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Clients')
@ApiBearerAuth('tenant-auth')
@Controller('clients')
export class ClientsController {
  constructor(private service: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'List clients' })
  findAll(@Req() req: TenantRequest) { return this.service.findAll(req.tenant!.tenantId); }

  @Get(':id')
  @ApiOperation({ summary: 'Get client by ID' })
  findOne(@Req() req: TenantRequest, @Param('id') id: string) { return this.service.findOne(req.tenant!.tenantId, id); }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner')
  @ApiOperation({ summary: 'Create a client' })
  create(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.create(req.tenant!.tenantId, dto, dto.client_uuid as string);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('owner')
  @ApiOperation({ summary: 'Update a client' })
  update(@Req() req: TenantRequest, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.update(req.tenant!.tenantId, id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('owner')
  @ApiOperation({ summary: 'Delete a client' })
  remove(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.service.remove(req.tenant!.tenantId, id);
  }
}
