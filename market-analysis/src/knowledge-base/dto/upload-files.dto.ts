import { IsUUID } from 'class-validator';

export class UploadFilesDto {
  @IsUUID()
  knowledge_base_id: string;
}
