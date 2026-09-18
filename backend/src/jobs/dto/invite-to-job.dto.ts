import { IsString, MaxLength, MinLength } from 'class-validator';

// A customer inviting one professional to their own job.
export class InviteToJobDto {
  // The professional's public id (short code shown on their profile).
  @IsString()
  @MaxLength(20)
  pro!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  message!: string;
}
