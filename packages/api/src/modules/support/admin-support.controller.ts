import { Body, Controller, Get, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DatabaseService } from '../../common/database/database.service';
import { PlatformGuard } from '../../common/guards/platform.guard';

/** Platform admin support desk (ADM-04, S43). Pool B identities only. */
@ApiTags('Admin - Support')
@ApiBearerAuth('platform-auth')
@Controller('admin/support')
@UseGuards(PlatformGuard)
export class AdminSupportController {
  constructor(private db: DatabaseService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'List all support tickets with tenant names' })
  async tickets() {
    const result = await this.db.query('platform',
      `SELECT st.*, t.name AS tenant_name FROM platform.support_tickets st
       JOIN platform.tenants t ON t.id = st.tenant_id
       ORDER BY st.created_at DESC LIMIT 200`);
    return result.rows;
  }

  @Patch('tickets/:id')
  @ApiOperation({ summary: 'Update a ticket status' })
  async updateTicket(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    const allowed = ['open', 'in_progress', 'resolved', 'closed'];
    const status = allowed.includes(String(dto.status)) ? String(dto.status) : 'open';
    const result = await this.db.query('platform',
      `UPDATE platform.support_tickets SET status = $2 WHERE id = $1 RETURNING *`, [id, status]);
    return result.rows[0];
  }

  @Get('announcements')
  @ApiOperation({ summary: 'List announcements' })
  async announcements() {
    const result = await this.db.query('platform',
      `SELECT * FROM platform.announcements ORDER BY created_at DESC LIMIT 50`);
    return result.rows;
  }

  @Post('announcements')
  @ApiOperation({ summary: 'Broadcast an announcement (ADM-05)' })
  async announce(@Req() req: { user?: { id?: string } }, @Body() dto: Record<string, unknown>) {
    const result = await this.db.query('platform',
      `INSERT INTO platform.announcements (title, body, target_tenant_id, created_by)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [dto.title, dto.body, dto.target_tenant_id ?? null, req.user?.id ?? '00000000-0000-0000-0000-000000000000']);
    return result.rows[0];
  }
}
