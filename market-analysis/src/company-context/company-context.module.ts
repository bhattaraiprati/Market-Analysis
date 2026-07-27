import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CompanyContextService } from './company-context.service';
import { Organization } from '../models/organization.model';

@Module({
  imports: [SequelizeModule.forFeature([Organization])],
  providers: [CompanyContextService],
  exports: [CompanyContextService],
})
export class CompanyContextModule {}
