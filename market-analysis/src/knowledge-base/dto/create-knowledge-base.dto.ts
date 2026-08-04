import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';
import { KnowledgeBaseVisibility } from '../../models/knowledge-base.model';

export class CreateKnowledgeBaseDto {
  @IsString()
  @MinLength(3, { message: 'Name must be at least 3 characters long' })
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  declare name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Description must not exceed 2000 characters' })
  declare description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  declare tags?: string[];

  @IsOptional()
  @IsEnum(KnowledgeBaseVisibility)
  visibility?: KnowledgeBaseVisibility;
}
