import { IsBoolean, IsInt, Max, Min } from 'class-validator';

export class SetSubscriptionDto {
  // true = grant platform access, false = suspend it.
  @IsBoolean()
  isActive!: boolean;
}

export class GrantComplimentaryDto {
  // Number of months of free access (0 revokes it). 1 / 3 / 6 / 12 in the UI.
  @IsInt()
  @Min(0)
  @Max(24)
  months!: number;
}
