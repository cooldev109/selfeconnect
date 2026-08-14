import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  MaxLength,
  Min,
  MinLength,
  IsString,
} from 'class-validator';
import { WEEK_DAYS } from './create-job.dto';

export class UpdateJobDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  categorySlug?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  postcode?: string;

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

  // Raise (or lower) the quote limit on an existing job. Null clears the limit.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxContacts?: number | null;

  // A lifecycle transition. The service enforces which changes are valid
  // (e.g. open -> hired -> in_progress -> completed, or -> cancelled).
  @IsOptional()
  @IsIn(['open', 'hired', 'in_progress', 'completed', 'cancelled', 'closed'])
  status?: 'open' | 'hired' | 'in_progress' | 'completed' | 'cancelled' | 'closed';

  // Optional note when cancelling a job.
  @IsOptional()
  @IsString()
  @MaxLength(300)
  cancelReason?: string;

  // The professional the customer says they hired. Pass a publicId to record
  // the hire, or null to clear it. Typically sent together with status:'closed'
  // when the customer clicks "I've found my professional".
  @IsOptional()
  @IsString()
  @MaxLength(16)
  hiredDriverPublicId?: string | null;
}
