import { Controller, Get, Post, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Expenses')
@ApiBearerAuth('tenant-auth')
@Controller('expenses')
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

  @Post('categories')
  @ApiOperation({ summary: 'Create an expense category' })
  createCategory(@Req() req: TenantRequest, @Body() dto: { name: string }) {
    return this.service.createCategory(req.tenant!.tenantId, dto?.name);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Rename an expense category' })
  updateCategory(@Req() req: TenantRequest, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.updateCategory(req.tenant!.tenantId, id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete an expense category' })
  deleteCategory(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.service.deleteCategory(req.tenant!.tenantId, id);
  }

  @Post(':id/corrections')
  @ApiOperation({ summary: 'Correct an expense (creates a new version)' })
  correct(@Req() req: TenantRequest, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.correct(req.tenant!.tenantId, id, dto, req.user!.id as string);
  }

  @Post(':id/void')
  @ApiOperation({ summary: 'Void an expense with a reason (retires it from live data, keeps history)' })
  voidExpense(@Req() req: TenantRequest, @Param('id') id: string, @Body() dto: { reason: string }) {
    return this.service.voidExpense(req.tenant!.tenantId, id, dto?.reason);
  }
}
