import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { User } from '../models/user.model';
import { Organization } from '../models/organization.model';
import { OrganizationMember } from '../models/organizationMember.model';
import { ResearchJob } from '../models/research-job.model';
import { ResearchSource } from '../models/research-source.model';
import { KnowledgeBase } from '../models/knowledge-base.model';
import { KBFile } from '../models/kb-file.model';
import { Persona } from '../models/persona.model';
import { PersonaKnowledgeBase } from '../models/persona-knowledge-base.model';
import { PersonaPermission } from '../models/persona-permission.model';
import { Conversation } from '../models/conversation.model';
import { Message } from '../models/message.model';

export const getDatabaseConfig = (configService: ConfigService): SequelizeModuleOptions => {
  const databaseUrl = configService.get<string>('DATABASE_URL');

  // If DATABASE_URL is provided (Neon or other cloud providers), parse it
  if (databaseUrl) {
    const url = new URL(databaseUrl);

    return {
      dialect: 'postgres',
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      username: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading '/'
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false, // Required for Neon and most cloud PostgreSQL providers
        },
      },
      models: [
        User,
        Organization,
        OrganizationMember,
        ResearchJob,
        ResearchSource,
        KnowledgeBase,
        KBFile,
        Persona,
        PersonaKnowledgeBase,
        PersonaPermission,
        Conversation,
        Message,
      ],
      autoLoadModels: true,
      synchronize: configService.get<string>('NODE_ENV') === 'development',
      logging: false, // Disable SQL query logging
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    };
  }

  // Fallback to individual connection parameters (local PostgreSQL)
  return {
    dialect: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'postgres'),
    database: configService.get<string>('DB_NAME', 'market_analysis'),
    models: [User, Organization, OrganizationMember, ResearchJob, ResearchSource],
    autoLoadModels: true,
    synchronize: configService.get<string>('NODE_ENV') === 'development',
    logging: false, // Disable SQL query logging
  };
};
