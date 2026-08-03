import { PartialType } from '@nestjs/mapped-types';
import { CreateKnowledgeBaseDto } from './create-knowledge-base.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { KnowledgeBaseStatus } from '../../models/knowledge-base.model';

export class UpdateKnowledgeBaseDto extends PartialType(
  CreateKnowledgeBaseDto,
) {
  @IsOptional()
  @IsEnum(KnowledgeBaseStatus)
  status?: KnowledgeBaseStatus;
}
