import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateTipDto {
  @IsInt()
  @Min(50) // £0.50
  @Max(50000) // £500
  amount!: number; // pence

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  customerAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
