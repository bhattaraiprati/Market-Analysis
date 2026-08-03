import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { AccessLevel } from '../../models/persona-permission.model';

export class SharePersonaDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  user_ids?: string[];

  @IsEnum(AccessLevel)
  access_level: AccessLevel;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class GenerateLinkDto {
  @IsEnum(['public', 'organization'])
  link_type: 'public' | 'organization';
}

export class AssignKnowledgeBaseDto {
  @IsUUID('4')
  knowledge_base_id: string;

  @IsOptional()
  @IsEnum([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  priority?: number;
}
