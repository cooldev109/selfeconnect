import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateDriverDto {
  // Email me when new jobs match my trades and area.
  @IsOptional()
  @IsBoolean()
  notifyNewJobs?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  tagline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  // Marketplace profile — editable after registration.
  @IsOptional()
  @IsString()
  @MaxLength(600)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  postcode?: string;

  // Up to three trades per professional — see SignupDto for the reasoning.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  categorySlugs?: string[];

  // Optional social links (stored as entered). Empty string clears the link.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  instagram?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  facebook?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tiktok?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  linkedin?: string;
}
