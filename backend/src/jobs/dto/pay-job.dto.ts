import { IsInt, Max, Min } from 'class-validator';

export class PayJobDto {
  // Amount in pence. Min £1, capped at £1,000,000 as a sanity bound.
  @IsInt()
  @Min(100)
  @Max(100_000_000)
  amount!: number;
}
