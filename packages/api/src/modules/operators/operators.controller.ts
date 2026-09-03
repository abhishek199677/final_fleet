import { Controller, Get, Post, Put, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OperatorsService } from './operators.service';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Operators')
@ApiBearerAuth('tenant-auth')
@Controller('v1/operators')
export class OperatorsController {
  constructor(private service: OperatorsService) {}

  @Get()
  @ApiOperation({ summary: 'List operators' })
  findAll(@Req() req: TenantRequest) { return this.service.findAll(req.tenant!.tenantId); }

  @Get(':id')
  @ApiOperation({ summary: 'Get operator by ID' })
  findOne(@Req() req: TenantRequest, @Param('id') id: string) { return this.service.findById(req.tenant!.tenantId, id); }

  @Post()
  @ApiOperation({ summary: 'Create an operator' })
  create(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.create(req.tenant!.tenantId, dto, dto.client_uuid as string);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an operator' })
  update(@Req() req: TenantRequest, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.update(req.tenant!.tenantId, id, dto);
  }
}
