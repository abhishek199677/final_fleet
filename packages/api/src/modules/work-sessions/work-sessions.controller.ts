import { Controller, Get, Post, Patch, Param, Body, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkSessionsService } from './work-sessions.service';
import { CreateWorkSessionDto } from './dto/create-work-session.dto';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Work Sessions')
@ApiBearerAuth('tenant-auth')
@Controller('work-sessions')
export class WorkSessionsController {
  constructor(private service: WorkSessionsService) {}

  @Get()
  @ApiOperation({ summary: 'List work sessions' })
  findAll(@Req() req: TenantRequest, @Query('machine_id') machineId?: string) {
    return this.service.findAll(req.tenant!.tenantId, machineId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get work session by ID' })
  findOne(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.service.findOne(req.tenant!.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a work session' })
  create(@Req() req: TenantRequest, @Body() dto: CreateWorkSessionDto) {
    return this.service.create(req.tenant!.tenantId, dto as unknown as Record<string, unknown>, dto.client_uuid, req.user!.id as string);
  }

  @Post(':id/corrections')
  @ApiOperation({ summary: 'Correct a work session (creates new version)' })
  correct(@Req() req: TenantRequest, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.correct(req.tenant!.tenantId, id, dto, req.user!.id as string);
  }

  @Get('daily/:machineId/:date')
  @ApiOperation({ summary: 'Get daily rollup for a machine' })
  getDailyRollup(@Req() req: TenantRequest, @Param('machineId') machineId: string, @Param('date') date: string) {
    return this.service.getDailyRollup(req.tenant!.tenantId, machineId, date);
  }
}
