import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ResearchType } from '../research.types';

export { ResearchType };

export class StartResearchDto {
  @ApiProperty({
    enum: ResearchType,
    description: 'Type of research to perform',
    example: ResearchType.COMPETITOR,
  })
  @IsEnum(ResearchType)
  declare researchType: ResearchType;

  @ApiProperty({
    description: 'The primary question or topic the research should answer',
    required: false,
    example:
      'How is the digital wallet market in Nepal changing, and where are the strongest growth opportunities?',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  declare query?: string;

  @ApiProperty({
    description:
      'Optional constraints or instructions for the agents and final report',
    required: false,
    example:
      'Prioritize evidence from the last 12 months and compare pricing, customer needs, and regulation.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  declare instructions?: string;

  @ApiProperty({
    description: 'Additional parameters for research',
    required: false,
    example: {
      focusAreas: ['pricing', 'features'],
      geography: 'Nepal',
    },
  })
  @IsOptional()
  @IsObject()
  declare parameters?: Record<string, unknown>;
}
