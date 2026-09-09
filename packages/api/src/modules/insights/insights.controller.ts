import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InsightsService } from './insights.service';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';
import { UseGuards } from '@nestjs/common';

@ApiTags('Insights')
@ApiBearerAuth('tenant-auth')
@Controller('insights')
@UseGuards(RolesGuard)
@Roles('owner')
export class InsightsController {
  constructor(private service: InsightsService) {}

  @Get('ai')
  @ApiOperation({ summary: 'AI-powered per-vehicle insights: performance, issues, earnings, recommendations' })
  getAiInsights(@Req() req: TenantRequest) {
    return this.service.generateAiInsights(req.tenant!.tenantId);
  }
}
