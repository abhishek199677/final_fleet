import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards, NotFoundException } from '@nestjs/common';
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
  async findOne(@Req() req: TenantRequest, @Param('id') id: string) {
    const site = await this.service.findById(req.tenant!.tenantId, id);
    if (!site) throw new NotFoundException('Site not found');
    return site;
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner')
  @ApiOperation({ summary: 'Create a site' })
  create(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.create(req.tenant!.tenantId, dto, dto.client_uuid as string);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('owner')
  @ApiOperation({ summary: 'Update a site' })
  update(@Req() req: TenantRequest, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.update(req.tenant!.tenantId, id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('owner')
  @ApiOperation({ summary: 'Delete a site' })
  remove(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.service.remove(req.tenant!.tenantId, id);
  }
}
