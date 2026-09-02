import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  MaxLength,
  Min,
  MinLength,
  IsString,
} from 'class-validator';

export const WEEK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export class CreateJobDto {
  @IsString()
  @MinLength(1)
  categorySlug!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(25)
  @MaxLength(2000)
  description!: string;

  @IsString()
  @MaxLength(12)
  postcode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsIn(WEEK_DAYS, { each: true })
  workingDays?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  workingHours?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  budget?: string;

  // When the customer needs the work done — a simple human phrase.
  @IsOptional()
  @IsString()
  @MaxLength(120)
  timing?: string;

  // Photo URLs (uploaded via POST /jobs/photo) shown to professionals.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  photos?: string[];

  // How many professionals may unlock the customer's contact details. Omitted
  // or null = no limit. Capped at 50 so a "limit" can't be a de-facto free-for-all.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxContacts?: number | null;

  // The customer must tick this to post — it authorises sharing their contact
  // details with relevant professionals. Enforced in the service, not just here,
  // so a missing value gives a clear message rather than a generic 400.
  @IsOptional()
  @IsBoolean()
  contactConsent?: boolean;
}
