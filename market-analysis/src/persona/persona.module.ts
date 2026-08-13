import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PersonaService } from './persona.service';
import { PersonaController } from './persona.controller';
import { Persona } from '../models/persona.model';
import { PersonaKnowledgeBase } from '../models/persona-knowledge-base.model';
import { PersonaPermission } from '../models/persona-permission.model';
import { KnowledgeBase } from '../models/knowledge-base.model';
import { KBFile } from '../models/kb-file.model';
import { Conversation } from '../models/conversation.model';
import { Message } from '../models/message.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Persona,
      PersonaKnowledgeBase,
      PersonaPermission,
      KnowledgeBase,
      KBFile,
      Conversation,
      Message,
    ]),
  ],
  controllers: [PersonaController],
  providers: [PersonaService],
  exports: [PersonaService],
})
export class PersonaModule {}
