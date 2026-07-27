import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ResearchController } from './research.controller';
import { ResearchService } from './research.service';
import { ResearchJob } from '../models/research-job.model';
import { ResearchSource } from '../models/research-source.model';
import { SearcherModule } from '../agents/searcher/searcher.module';
import { AnalystModule } from '../agents/analyst/analyst.module';
import { CompanyContextModule } from '../company-context/company-context.module';

@Module({
  imports: [
    SequelizeModule.forFeature([ResearchJob, ResearchSource]),
    SearcherModule,
    AnalystModule,
    CompanyContextModule,
  ],
  controllers: [ResearchController],
  providers: [ResearchService],
  exports: [ResearchService],
})
export class ResearchModule {}
