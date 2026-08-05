import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { RateMessageDto } from './dto/rate-message.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a private conversation from the first user message',
  })
  @ApiResponse({
    status: 201,
    description: 'Conversation and first message created successfully',
  })
  async createConversation(
    @Body() createDto: CreateConversationDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const organizationId = this.requireOrganizationId(user);

    const result = await this.conversationService.createConversation(
      createDto.persona_id,
      user.userId,
      organizationId,
      createDto.content,
    );

    return {
      success: true,
      data: result,
      message: 'Conversation created. Response will be generated shortly.',
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all conversations for the current user' })
  @ApiResponse({ status: 200, description: 'Conversations retrieved successfully' })
  async getUserConversations(
    @Query('persona_id') personaId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const organizationId = this.requireOrganizationId(user);

    const conversations = await this.conversationService.getUserConversations(
      user.userId,
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
    @CurrentUser() user: CurrentUserData,
  ) {
    const organizationId = this.requireOrganizationId(user);

    const conversation = await this.conversationService.getConversation(
      conversationId,
      user.userId,
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
    @CurrentUser() user: CurrentUserData,
  ) {
    const organizationId = this.requireOrganizationId(user);

    const message = await this.conversationService.sendMessage(
      conversationId,
      user.userId,
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
    @CurrentUser() user: CurrentUserData,
  ) {
    const organizationId = this.requireOrganizationId(user);

    await this.conversationService.rateMessage(
      messageId,
      conversationId,
      user.userId,
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
    @CurrentUser() user: CurrentUserData,
  ) {
    const organizationId = this.requireOrganizationId(user);

    await this.conversationService.archiveConversation(
      conversationId,
      user.userId,
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
    @CurrentUser() user: CurrentUserData,
  ) {
    const organizationId = this.requireOrganizationId(user);

    await this.conversationService.deleteConversation(
      conversationId,
      user.userId,
      organizationId,
    );

    return {
      success: true,
      message: 'Conversation deleted successfully',
    };
  }

  private requireOrganizationId(user: CurrentUserData): string {
    if (!user.organizationId) {
      throw new BadRequestException(
        'User must belong to an organization to use conversations',
      );
    }

    return user.organizationId;
  }
}
