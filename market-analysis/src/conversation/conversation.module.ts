import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { Conversation } from '../models/conversation.model';
import { Message } from '../models/message.model';
import { Persona } from '../models/persona.model';
import { ConversationOrchestratorAgent } from '../agents/conversation-orchestrator/conversation-orchestrator.agent';
import { QueryRouterAgent } from '../agents/query-router/query-router.agent';
import { WriterAgent } from '../agents/writer/writer.agent';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { CompanyContextModule } from '../company-context/company-context.module';
import { ConversationWebSearchService } from './conversation-web-search.service';

@Module({
  imports: [
    SequelizeModule.forFeature([Conversation, Message, Persona]),
    KnowledgeBaseModule,
    CompanyContextModule,
  ],
  controllers: [ConversationController],
  providers: [
    ConversationService,
    ConversationOrchestratorAgent,
    QueryRouterAgent,
    WriterAgent,
    ConversationWebSearchService,
  ],
  exports: [ConversationService],
})
export class ConversationModule {}
