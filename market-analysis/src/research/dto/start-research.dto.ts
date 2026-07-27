import { IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ResearchType {
  COMPETITOR = 'COMPETITOR',
  MARKET = 'MARKET',
  CUSTOMER = 'CUSTOMER',
  COMPREHENSIVE = 'COMPREHENSIVE',
}

export class StartResearchDto {
  @ApiProperty({
    enum: ResearchType,
    description: 'Type of research to perform',
    example: ResearchType.COMPETITOR,
  })
  @IsEnum(ResearchType)
  researchType: ResearchType;

  @ApiProperty({
    description: 'Additional parameters for research',
    required: false,
    example: { focusAreas: ['pricing', 'features'] },
  })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;
}
