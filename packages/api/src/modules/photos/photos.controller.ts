import { Controller, Get, Post, Param, Body, Query, Req, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { PhotosService } from './photos.service';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

@ApiTags('Photos')
@ApiBearerAuth('tenant-auth')
@Controller('photos')
export class PhotosController {
  constructor(private service: PhotosService) {}

  @Post('presign')
  @ApiOperation({ summary: 'Get an upload URL/path' })
  presign(@Req() req: TenantRequest, @Body() dto: Record<string, unknown>) {
    return this.service.presignUpload(req.tenant!.tenantId, dto, dto.client_uuid as string);
  }

  @Post(':id/upload')
  @ApiOperation({ summary: 'Upload a photo file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadFile(id, req.tenant!.tenantId, file.buffer, file.originalname);
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

  @Get(':id')
  @ApiOperation({ summary: 'Download a photo' })
  async getPhoto(@Req() req: TenantRequest, @Param('id') id: string, @Res() res: Response) {
    const { buffer, contentType } = await this.service.getPhotoFile(id, req.tenant!.tenantId);
    res.set({
      'Content-Type': contentType,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'public, max-age=31536000',
    });
    res.send(buffer);
  }

  @Get(':id/url')
  @ApiOperation({ summary: 'Get photo download URL' })
  getUrl(@Req() req: TenantRequest, @Param('id') id: string) {
    return { url: `/api/v1/photos/${id}` };
  }

  @Post(':id/delete')
  @ApiOperation({ summary: 'Delete a photo' })
  delete(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.service.deletePhoto(id, req.tenant!.tenantId);
  }
}
