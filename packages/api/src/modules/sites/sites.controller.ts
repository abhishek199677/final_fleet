import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SitesService } from './sites.service';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Sites')
@ApiBearerAuth('tenant-auth')
@Controller('v1/sites')
export class SitesController {
  constructor(private service: SitesService) {}

  @Get()
  @ApiOperation({ summary: 'List sites' })
  findAll(@Req() req: TenantRequest) { return this.service.findAll(req.tenant!.tenantId); }

  @Get(':id')
  @ApiOperation({ summary: 'Get site by ID' })
  findOne(@Req() req: TenantRequest, @Param('id') id: string) { return this.service.findById(req.tenant!.tenantId, id); }

  @Post()
  @ApiOperation({ summary: 'Create a site' })
  create(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.create(req.tenant!.tenantId, dto, dto.client_uuid as string);
  }
}
