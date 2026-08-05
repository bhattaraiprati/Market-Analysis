import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Conversation, ConversationStatus } from '../models/conversation.model';
import { Message, MessageRole, MessageStatus } from '../models/message.model';
import { Persona } from '../models/persona.model';
import { ConversationOrchestratorAgent } from '../agents/conversation-orchestrator/conversation-orchestrator.agent';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @InjectModel(Conversation)
    private conversationModel: typeof Conversation,
    @InjectModel(Message)
    private messageModel: typeof Message,
    @InjectModel(Persona)
    private personaModel: typeof Persona,
    private conversationOrchestrator: ConversationOrchestratorAgent,
    private knowledgeBaseService: KnowledgeBaseService,
  ) {}

  /**
   * Create a new conversation
   */
  async createConversation(
    personaId: string,
    userId: string,
    organizationId: string,
    content: string,
  ): Promise<{ conversation: Conversation; message: Message }> {
    try {
      // A persona can have many private conversations, but each conversation
      // is owned by exactly one user.
      const persona = await this.personaModel.findOne({
        where: {
          id: personaId,
          organization_id: organizationId,
        },
      });

      if (!persona) {
        throw new NotFoundException('Persona not found');
      }

      const transaction = await this.conversationModel.sequelize!.transaction();
      let conversation: Conversation;
      let userMessage: Message;
      let assistantMessage: Message;

      try {
        const now = new Date();
        conversation = await this.conversationModel.create(
          {
            organization_id: organizationId,
            user_id: userId,
            persona_id: personaId,
            title: this.generateTitle(content),
            status: ConversationStatus.ACTIVE,
            total_messages: 2,
            last_message_at: now,
          },
          { transaction },
        );

        userMessage = await this.messageModel.create(
          {
            conversation_id: conversation.id,
            user_id: userId,
            role: MessageRole.USER,
            content: content.trim(),
            status: MessageStatus.COMPLETED,
          },
          { transaction },
        );

        assistantMessage = await this.messageModel.create(
          {
            conversation_id: conversation.id,
            role: MessageRole.ASSISTANT,
            content: '',
            status: MessageStatus.PROCESSING,
          },
          { transaction },
        );

        await persona.increment(
          { total_conversations: 1, total_messages: 2 },
          { transaction },
        );
        await persona.update({ last_used_at: now }, { transaction });
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

      this.logger.log(`Conversation created: ${conversation.id}`);
      void this.processMessage(conversation, userMessage, assistantMessage);

      return { conversation, message: userMessage };
    } catch (error) {
      this.logger.error('Failed to create conversation', error);
      throw error;
    }
  }

  /**
   * Get all conversations for a user with a specific persona
   */
  async getUserConversations(
    userId: string,
    organizationId: string,
    personaId?: string,
  ): Promise<Conversation[]> {
    try {
      const where: any = {
        user_id: userId,
        organization_id: organizationId,
        status: ConversationStatus.ACTIVE,
      };

      if (personaId) {
        where.persona_id = personaId;
      }

      const conversations = await this.conversationModel.findAll({
        where,
        include: [
          {
            model: Persona,
            as: 'persona',
            attributes: ['id', 'name', 'avatar_url', 'primary_focus_role'],
          },
        ],
        order: [['last_message_at', 'DESC']],
      });

      return conversations;
    } catch (error) {
      this.logger.error('Failed to fetch conversations', error);
      throw error;
    }
  }

  /**
   * Get a single conversation with messages
   */
  async getConversation(
    conversationId: string,
    userId: string,
    organizationId: string,
  ): Promise<Conversation> {
    try {
      const conversation = await this.conversationModel.findOne({
        where: {
          id: conversationId,
          user_id: userId,
          organization_id: organizationId,
        },
        include: [
          {
            model: Persona,
            as: 'persona',
            attributes: ['id', 'name', 'avatar_url', 'primary_focus_role', 'description'],
          },
          {
            model: Message,
            as: 'messages',
          },
        ],
        order: [[{ model: Message, as: 'messages' }, 'created_at', 'ASC']],
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      return conversation;
    } catch (error) {
      this.logger.error('Failed to fetch conversation', error);
      throw error;
    }
  }

  /**
   * Send a message in a conversation (main entry point for chat)
   */
  async sendMessage(
    conversationId: string,
    userId: string,
    organizationId: string,
    content: string,
  ): Promise<Message> {
    try {
      // Verify conversation exists
      const conversation = await this.getConversation(conversationId, userId, organizationId);

      const transaction = await this.conversationModel.sequelize!.transaction();
      let userMessage: Message;
      let assistantMessage: Message;

      try {
        const now = new Date();
        userMessage = await this.messageModel.create(
          {
            conversation_id: conversationId,
            user_id: userId,
            role: MessageRole.USER,
            content: content.trim(),
            status: MessageStatus.COMPLETED,
          },
          { transaction },
        );

        assistantMessage = await this.messageModel.create(
          {
            conversation_id: conversationId,
            role: MessageRole.ASSISTANT,
            content: '',
            status: MessageStatus.PROCESSING,
          },
          { transaction },
        );

        await conversation.increment('total_messages', {
          by: 2,
          transaction,
        });
        await conversation.update({ last_message_at: now }, { transaction });
        await this.personaModel.increment('total_messages', {
          by: 2,
          where: { id: conversation.persona_id },
          transaction,
        });
        await this.personaModel.update(
          { last_used_at: now },
          { where: { id: conversation.persona_id }, transaction },
        );
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

      this.logger.log(`User message created: ${userMessage.id}`);

      // Process message asynchronously
      void this.processMessage(conversation, userMessage, assistantMessage);

      return userMessage;
    } catch (error) {
      this.logger.error('Failed to send message', error);
      throw error;
    }
  }

  /**
   * Process user message and generate assistant response
   */
  private async processMessage(
    conversation: Conversation,
    userMessage: Message,
    assistantMessage: Message,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Load persona configuration
      const persona = await this.personaModel.findOne({
        where: { id: conversation.persona_id },
        include: ['knowledgeBases'],
      });

      if (!persona) {
        throw new NotFoundException('Persona not found');
      }

      // Get conversation history
      const history = await this.messageModel.findAll({
        where: { conversation_id: conversation.id },
        order: [['created_at', 'ASC']],
        limit: 20, // Last 20 messages for context
      });

      const conversationHistory = history
        .filter((m) => m.id !== userMessage.id && m.id !== assistantMessage.id)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      // Prepare persona config
      const personaConfig = {
        name: persona.name,
        description: persona.description,
        primary_focus_role: persona.primary_focus_role,
        system_prompt: persona.system_prompt,
        web_search_enabled: persona.web_search_enabled,
        knowledgeBaseIds: persona.knowledgeBases?.map((kb: any) => kb.id) || [],
      };

      // Execute conversation orchestrator
      this.logger.log(`🚀 Processing query: "${userMessage.content}"`);

      const result = await this.conversationOrchestrator.execute({
        organizationId: conversation.organization_id,
        researchJobId: '', // Not needed for conversations
        companyContext: '', // Not needed for conversations
        additionalParams: {
          userQuery: userMessage.content,
          personaConfig,
          conversationHistory,
          knowledgeBaseService: this.knowledgeBaseService,
          // TODO: Implement web search functionality
          // searchService: {
          //   search: async (query: string) => {
          //     // Web search not yet implemented
          //     return [];
          //   },
          // },
        },
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Conversation orchestrator failed');
      }

      const processingTime = Date.now() - startTime;

      // Update assistant message
      await assistantMessage.update({
        content: result.data.response,
        status: MessageStatus.COMPLETED,
        intent_analysis: result.data.intent,
        sources_used: result.data.sourcesUsed,
        processing_time_ms: processingTime,
        model_used: result.data.modelUsed,
        total_tokens: 0, // TODO: Calculate from usage
      });

      this.logger.log(`✅ Message processed successfully in ${processingTime}ms`);
    } catch (error) {
      this.logger.error('Failed to process message', error);

      // Update assistant message with error
      await assistantMessage.update({
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        status: MessageStatus.FAILED,
        error_message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Generate conversation title from first message
   */
  private generateTitle(firstMessage: string): string {
    const normalized = firstMessage.replace(/\s+/g, ' ').trim();
    const maxTitleLength = 80;

    return normalized.length > maxTitleLength
      ? `${normalized.slice(0, maxTitleLength - 3).trimEnd()}...`
      : normalized;
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(
    conversationId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId, userId, organizationId);

      await conversation.update({ status: ConversationStatus.ARCHIVED });

      this.logger.log(`Conversation archived: ${conversationId}`);
    } catch (error) {
      this.logger.error('Failed to archive conversation', error);
      throw error;
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(
    conversationId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId, userId, organizationId);

      await conversation.destroy();

      this.logger.log(`Conversation deleted: ${conversationId}`);
    } catch (error) {
      this.logger.error('Failed to delete conversation', error);
      throw error;
    }
  }

  /**
   * Rate a message
   */
  async rateMessage(
    messageId: string,
    conversationId: string,
    userId: string,
    organizationId: string,
    rating: number,
    feedback?: string,
  ): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId, userId, organizationId);

      const message = await this.messageModel.findOne({
        where: {
          id: messageId,
          conversation_id: conversationId,
        },
      });

      if (!message) {
        throw new NotFoundException('Message not found');
      }

      await message.update({ rating, feedback });

      this.logger.log(`Message rated: ${messageId} - ${rating}/5`);
    } catch (error) {
      this.logger.error('Failed to rate message', error);
      throw error;
    }
  }
}
