import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Support')
@ApiBearerAuth('tenant-auth')
@Controller('support')
export class SupportController {
  constructor(private service: SupportService) {}

  @Post('tickets')
  @ApiOperation({ summary: 'File a support ticket (ADM-04)' })
  create(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.create(req.tenant!.tenantId, req.user!.id as string, dto);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'List this tenant\'s support tickets' })
  @UseGuards(RolesGuard)
  @Roles('owner')
  findMine(@Req() req: TenantRequest) {
    return this.service.findMine(req.tenant!.tenantId);
  }
}
