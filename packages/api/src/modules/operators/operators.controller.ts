import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OperatorsService } from './operators.service';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Operators')
@ApiBearerAuth('tenant-auth')
@Controller('operators')
export class OperatorsController {
  constructor(private service: OperatorsService) {}

  @Get()
  @ApiOperation({ summary: 'List operators' })
  findAll(@Req() req: TenantRequest) { return this.service.findAll(req.tenant!.tenantId); }

  @Get(':id')
  @ApiOperation({ summary: 'Get operator by ID' })
  async findOne(@Req() req: TenantRequest, @Param('id') id: string) {
    const operator = await this.service.findById(req.tenant!.tenantId, id);
    if (!operator) throw new NotFoundException('Operator not found');
    return operator;
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner')
  @ApiOperation({ summary: 'Create an operator' })
  create(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.create(req.tenant!.tenantId, dto, dto.client_uuid as string);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an operator' })
  @UseGuards(RolesGuard)
  @Roles('owner')
  update(@Req() req: TenantRequest, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.update(req.tenant!.tenantId, id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Patch an operator' })
  @UseGuards(RolesGuard)
  @Roles('owner')
  patch(@Req() req: TenantRequest, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.update(req.tenant!.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an operator' })
  @UseGuards(RolesGuard)
  @Roles('owner')
  remove(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.service.remove(req.tenant!.tenantId, id);
  }
}
