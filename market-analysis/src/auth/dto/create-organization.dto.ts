import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateOrganizationDto {
  @IsNotEmpty({ message: 'Organization name is required' })
  @IsString({ message: 'Organization name must be a string' })
  @MinLength(2, { message: 'Organization name must be at least 2 characters' })
  @MaxLength(200, { message: 'Organization name cannot exceed 200 characters' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters' })
  description?: string;

  @IsNotEmpty({ message: 'Industry is required' })
  @IsString({ message: 'Industry must be a string' })
  @MinLength(2, { message: 'Industry must be at least 2 characters' })
  @MaxLength(100, { message: 'Industry cannot exceed 100 characters' })
  industry: string;

  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  @MaxLength(255, { message: 'Website URL cannot exceed 255 characters' })
  website?: string;

  @IsNotEmpty({ message: 'Product or service description is required' })
  @IsString({ message: 'Product or service must be a string' })
  @MinLength(10, { message: 'Product or service description must be at least 10 characters' })
  @MaxLength(2000, { message: 'Product or service description cannot exceed 2000 characters' })
  product_or_service: string;

  @IsNotEmpty({ message: 'Target customers description is required' })
  @IsString({ message: 'Target customers must be a string' })
  @MinLength(10, { message: 'Target customers description must be at least 10 characters' })
  @MaxLength(2000, { message: 'Target customers description cannot exceed 2000 characters' })
  target_customers: string;

  @IsNotEmpty({ message: 'Business goals are required' })
  @IsString({ message: 'Business goals must be a string' })
  @MinLength(10, { message: 'Business goals must be at least 10 characters' })
  @MaxLength(2000, { message: 'Business goals cannot exceed 2000 characters' })
  business_goals: string;

  @IsOptional()
  @IsString({ message: 'Current challenges must be a string' })
  @MaxLength(2000, { message: 'Current challenges cannot exceed 2000 characters' })
  current_challenges?: string;

  @IsOptional()
  @IsArray({ message: 'Known competitors must be an array' })
  @IsString({ each: true, message: 'Each competitor must be a string' })
  known_competitors?: string[];

  @IsOptional()
  @IsString({ message: 'Company size must be a string' })
  @MaxLength(50, { message: 'Company size cannot exceed 50 characters' })
  company_size?: string;

  @IsOptional()
  @IsString({ message: 'Location must be a string' })
  @MaxLength(200, { message: 'Location cannot exceed 200 characters' })
  location?: string;
}
