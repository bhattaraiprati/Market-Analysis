import { IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @IsUUID()
  persona_id: string;

  @IsString()
  @IsOptional()
  title?: string;
}
