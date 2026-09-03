import { Controller, Get, Post, Param, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PhotosService } from './photos.service';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Photos')
@ApiBearerAuth('tenant-auth')
@Controller('v1/photos')
export class PhotosController {
  constructor(private service: PhotosService) {}

  @Post('presign')
  @ApiOperation({ summary: 'Get a presigned upload URL' })
  presign(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.presignUpload(req.tenant!.tenantId, dto, dto.client_uuid as string);
  }

  @Post(':id/commit')
  @ApiOperation({ summary: 'Commit an uploaded photo with SHA-256' })
  commit(@Req() req: TenantRequest, @Param('id') id: string, @Body() dto: { sha256: string }) {
    return this.service.commitUpload(req.tenant!.tenantId, id, dto.sha256);
  }

  @Get()
  @ApiOperation({ summary: 'List photos for an entity' })
  @ApiQuery({ name: 'entity_type', required: true })
  @ApiQuery({ name: 'entity_id', required: true })
  getPhotos(@Req() req: TenantRequest, @Query('entity_type') entityType: string, @Query('entity_id') entityId: string) {
    return this.service.getPhotos(req.tenant!.tenantId, entityType, entityId);
  }

  @Get(':id/url')
  @ApiOperation({ summary: 'Get a signed download URL' })
  getSignedUrl(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.service.getSignedUrl(id, req.tenant!.tenantId);
  }
}
