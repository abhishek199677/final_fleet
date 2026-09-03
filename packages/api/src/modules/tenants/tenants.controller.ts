import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';

@ApiTags('Admin - Tenants')
@ApiBearerAuth('platform-auth')
@Controller('admin/tenants')
export class TenantsController {
  constructor(private service: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'List all tenants' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  create(@Body() dto: CreateTenantDto) {
    return this.service.create(dto);
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Suspend a tenant' })
  suspend(@Param('id') id: string) {
    return this.service.suspend(id);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive a tenant' })
  archive(@Param('id') id: string) {
    return this.service.archive(id);
  }
}
