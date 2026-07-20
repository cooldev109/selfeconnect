import { IsBoolean } from 'class-validator';

export class SetSubscriptionDto {
  // true = grant platform access, false = suspend it.
  @IsBoolean()
  isActive!: boolean;
}
