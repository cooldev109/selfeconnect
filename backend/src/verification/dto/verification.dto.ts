import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// Text fields that ride alongside a verification document upload (multipart,
// so everything arrives as strings). `expiresAt` is an ISO date the service
// parses; label/reference are shown in the admin queue and on the badge.
export class SubmitDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  expiresAt?: string;
}

export class StartPhoneDto {
  // Optional: verify the phone already on the profile, or pass a new one.
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
}

export class ConfirmPhoneDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code!: string;
}

export class RejectVerificationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

// Guards a future "manual" admin action; unused today but keeps the shape ready.
export class AdminReviewQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
