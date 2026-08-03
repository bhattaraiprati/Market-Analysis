import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { RateMessageDto } from './dto/rate-message.dto';

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new conversation with a persona' })
  @ApiResponse({ status: 201, description: 'Conversation created successfully' })
  async createConversation(
    @Body() createDto: CreateConversationDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    const organizationId = req.user.organization_id;

    const conversation = await this.conversationService.createConversation(
      createDto.persona_id,
      userId,
      organizationId,
      createDto.title,
    );

    return {
      success: true,
      data: conversation,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all conversations for the current user' })
  @ApiResponse({ status: 200, description: 'Conversations retrieved successfully' })
  async getUserConversations(
    @Query('persona_id') personaId: string,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    const organizationId = req.user.organization_id;

    const conversations = await this.conversationService.getUserConversations(
      userId,
      organizationId,
      personaId,
    );

    return {
      success: true,
      data: conversations,
      count: conversations.length,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a conversation with all messages' })
  @ApiResponse({ status: 200, description: 'Conversation retrieved successfully' })
  async getConversation(
    @Param('id') conversationId: string,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    const organizationId = req.user.organization_id;

    const conversation = await this.conversationService.getConversation(
      conversationId,
      userId,
      organizationId,
    );

    return {
      success: true,
      data: conversation,
    };
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() sendMessageDto: SendMessageDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    const organizationId = req.user.organization_id;

    const message = await this.conversationService.sendMessage(
      conversationId,
      userId,
      organizationId,
      sendMessageDto.content,
    );

    return {
      success: true,
      data: message,
      message: 'Message sent. Response will be generated shortly.',
    };
  }

  @Post(':id/messages/:messageId/rate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rate a message' })
  @ApiResponse({ status: 200, description: 'Message rated successfully' })
  async rateMessage(
    @Param('id') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() rateDto: RateMessageDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    const organizationId = req.user.organization_id;

    await this.conversationService.rateMessage(
      messageId,
      conversationId,
      userId,
      organizationId,
      rateDto.rating,
      rateDto.feedback,
    );

    return {
      success: true,
      message: 'Message rated successfully',
    };
  }

  @Delete(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a conversation' })
  @ApiResponse({ status: 200, description: 'Conversation archived successfully' })
  async archiveConversation(
    @Param('id') conversationId: string,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    const organizationId = req.user.organization_id;

    await this.conversationService.archiveConversation(
      conversationId,
      userId,
      organizationId,
    );

    return {
      success: true,
      message: 'Conversation archived successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a conversation' })
  @ApiResponse({ status: 200, description: 'Conversation deleted successfully' })
  async deleteConversation(
    @Param('id') conversationId: string,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    const organizationId = req.user.organization_id;

    await this.conversationService.deleteConversation(
      conversationId,
      userId,
      organizationId,
    );

    return {
      success: true,
      message: 'Conversation deleted successfully',
    };
  }
}
