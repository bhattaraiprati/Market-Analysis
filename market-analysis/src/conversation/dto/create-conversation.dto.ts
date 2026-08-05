import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @IsUUID()
  declare persona_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  declare content: string;
}
