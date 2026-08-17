import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateReviewDto {
  @IsString()
  driverPublicId!: string;

  // Optional link to a job the customer posted (makes the review "verified").
  @IsOptional()
  @IsString()
  jobId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

// A review left by scanning the QR code. No account, no payment — the two
// things the QR promises. It is stored without a customer, so it shows as
// unverified next to reviews from people who actually hired through the site.
export class CreateAnonymousReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  authorName?: string;
}

// M3.3 — a reason attached when someone reports a review.
export class ReportReviewDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
