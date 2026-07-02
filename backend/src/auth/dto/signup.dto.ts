import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignupDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  company?: string;

  // Marketplace: UK postcode (geocoded server-side) + the occupations this
  // professional offers. Optional at the API layer for backwards-compatibility;
  // the new registration UI collects both.
  @IsOptional()
  @IsString()
  @MaxLength(12)
  postcode?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  categorySlugs?: string[];
}
