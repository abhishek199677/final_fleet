import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Clients')
@ApiBearerAuth('tenant-auth')
@Controller('v1/clients')
export class ClientsController {
  constructor(private service: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'List clients' })
  findAll(@Req() req: TenantRequest) { return this.service.findAll(req.tenant!.tenantId); }

  @Get(':id')
  @ApiOperation({ summary: 'Get client by ID' })
  findOne(@Req() req: TenantRequest, @Param('id') id: string) { return this.service.findOne(req.tenant!.tenantId, id); }

  @Post()
  @ApiOperation({ summary: 'Create a client' })
  create(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.create(req.tenant!.tenantId, dto, dto.client_uuid as string);
  }
}
