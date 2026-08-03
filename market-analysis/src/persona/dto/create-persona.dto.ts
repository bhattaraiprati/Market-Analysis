import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUUID,
  MinLength,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { PersonaRole } from '../../models/persona.model';

export class CreatePersonaDto {
  @IsString()
  @MinLength(3, { message: 'Name must be at least 3 characters long' })
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Description must not exceed 2000 characters' })
  description?: string;

  @IsEnum(PersonaRole, { message: 'Invalid primary focus role' })
  primary_focus_role: PersonaRole;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each knowledge base ID must be a valid UUID' })
  knowledge_base_ids?: string[];

  @IsOptional()
  @IsBoolean()
  web_search_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  external_data_sources_enabled?: boolean;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  avatar_url?: string;

  @IsOptional()
  @IsString()
  system_prompt?: string;
}
