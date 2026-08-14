import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { KnowledgeBase } from '../models/knowledge-base.model';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { CompanyWebsiteIngestionService } from './company-website-ingestion.service';

@Module({
  imports: [SequelizeModule.forFeature([KnowledgeBase]), KnowledgeBaseModule],
  providers: [CompanyWebsiteIngestionService],
  exports: [CompanyWebsiteIngestionService],
})
export class CompanyIngestionModule {}
