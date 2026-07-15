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

  // A professional may list up to three trades — enough to cover related work
  // (e.g. Cleaner + Handyman + Man & Van) without turning a profile into a
  // catch-all that means nothing to a customer.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  categorySlugs?: string[];
}
