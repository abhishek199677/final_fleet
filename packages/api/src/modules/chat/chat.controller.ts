import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { TenantRequest } from '../../common/middleware/tenant-context.middleware';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(RolesGuard)
@ApiBearerAuth('tenant-auth')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('message')
  @ApiOperation({ summary: 'Send a message to the chatbot and get a response' })
  async chat(@Body() dto: { message: string }, @Req() req: TenantRequest) {
    return this.chatService.generateResponse(req.tenant!.tenantId, dto.message);
  }
}