import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ResearchModule } from './research/research.module';
import { CompanyContextModule } from './company-context/company-context.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { PersonaModule } from './persona/persona.module';
import { ConversationModule } from './conversation/conversation.module';
import { getDatabaseConfig } from './config/database.config';
import { LlmModule } from './llm/llm.module';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Database connection
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    // Feature modules
    LlmModule,
    AuthModule,
    CompanyContextModule,
    ResearchModule,
    KnowledgeBaseModule,
    PersonaModule,
    ConversationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
