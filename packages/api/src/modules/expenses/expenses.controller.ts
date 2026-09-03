import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Expenses')
@ApiBearerAuth('tenant-auth')
@Controller('v1/expenses')
export class ExpensesController {
  constructor(private service: ExpensesService) {}

  @Get()
  @ApiOperation({ summary: 'List expenses' })
  findAll(@Req() req: TenantRequest) { return this.service.findAll(req.tenant!.tenantId); }

  @Get('categories')
  @ApiOperation({ summary: 'List expense categories' })
  getCategories(@Req() req: TenantRequest) { return this.service.getCategories(req.tenant!.tenantId); }

  @Post()
  @ApiOperation({ summary: 'Create an expense' })
  create(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.create(req.tenant!.tenantId, dto, dto.client_uuid as string, req.user!.id as string);
  }
}
