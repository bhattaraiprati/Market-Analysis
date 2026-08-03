import { PartialType } from '@nestjs/mapped-types';
import { CreatePersonaDto } from './create-persona.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { PersonaStatus } from '../../models/persona.model';

export class UpdatePersonaDto extends PartialType(CreatePersonaDto) {
  @IsOptional()
  @IsEnum(PersonaStatus)
  status?: PersonaStatus;
}
