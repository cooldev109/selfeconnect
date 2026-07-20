import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTipDto {
  @IsInt()
  @Min(50) // £0.50
  @Max(200000) // £2,000 — covers job payments, not just tips
  amount!: number; // pence

  // 'tip' (default) or 'payment'. A payment is money for work done; a tip is a
  // gratuity. Same money movement, tracked separately.
  @IsOptional()
  @IsIn(['tip', 'payment'])
  type?: 'tip' | 'payment';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerName?: string;

  // Optional: supply it and we email a receipt.
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  customerEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  customerAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
