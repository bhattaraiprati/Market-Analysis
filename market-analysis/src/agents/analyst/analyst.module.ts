/**
 * Analyst Agent Module
 */

import { Module } from '@nestjs/common';
import { AnalystAgent } from './analyst.agent';
import { CompanyContextModule } from '../../company-context/company-context.module';

@Module({
  imports: [CompanyContextModule],
  providers: [AnalystAgent],
  exports: [AnalystAgent],
})
export class AnalystModule {}
