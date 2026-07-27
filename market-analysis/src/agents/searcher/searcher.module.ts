import { Module } from '@nestjs/common';
import { SearcherAgent } from './searcher.agent';
import { CompanyContextModule } from '../../company-context/company-context.module';

@Module({
  imports: [CompanyContextModule],
  providers: [SearcherAgent],
  exports: [SearcherAgent],
})
export class SearcherModule {}
