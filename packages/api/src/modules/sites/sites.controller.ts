import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SitesService } from './sites.service';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Sites')
@ApiBearerAuth('tenant-auth')
@Controller('sites')
export class SitesController {
  constructor(private service: SitesService) {}

  @Get()
  @ApiOperation({ summary: 'List sites' })
  findAll(@Req() req: TenantRequest) { return this.service.findAll(req.tenant!.tenantId); }

  @Get(':id')
  @ApiOperation({ summary: 'Get site by ID' })
  findOne(@Req() req: TenantRequest, @Param('id') id: string) { return this.service.findById(req.tenant!.tenantId, id); }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner')
  @ApiOperation({ summary: 'Create a site' })
  create(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.create(req.tenant!.tenantId, dto, dto.client_uuid as string);
  }
}
