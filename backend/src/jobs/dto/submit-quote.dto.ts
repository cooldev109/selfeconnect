import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class SubmitQuoteDto {
  // Price in pence. Optional — some work needs a visit before a firm number.
  // Capped at £1,000,000 so a fat-fingered amount can't overflow.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  amount?: number | null;

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  message!: string;
}
