import { Controller, Get, Post, Patch, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MachinesService } from './machines.service';
import { CreateMachineDto } from './dto/create-machine.dto';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Machines')
@ApiBearerAuth('tenant-auth')
@Controller('machines')
export class MachinesController {
  constructor(private service: MachinesService) {}

  @Get()
  @ApiOperation({ summary: 'List all machines' })
  findAll(@Req() req: TenantRequest) {
    return this.service.findAll(req.tenant!.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get machine by ID' })
  findOne(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.service.findOne(req.tenant!.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a machine' })
  @UseGuards(RolesGuard)
  @Roles('owner')
  create(@Req() req: TenantRequest, @Body() dto: CreateMachineDto) {
    return this.service.create(req.tenant!.tenantId, dto as unknown as Record<string, unknown>, dto.client_uuid);
  }

  @Patch(':id/meter')
  @ApiOperation({ summary: 'Update machine meter reading' })
  @UseGuards(RolesGuard)
  @Roles('owner')
  updateMeter(@Req() req: TenantRequest, @Param('id') id: string, @Body('meter') meter: number) {
    return this.service.updateMeter(req.tenant!.tenantId, id, meter);
  }
}
