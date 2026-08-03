import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class RateMessageDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}
