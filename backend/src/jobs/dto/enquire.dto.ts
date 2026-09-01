import { IsString, MaxLength, MinLength } from 'class-validator';

export class EnquireDto {
  // The professional's public id (short code shown on their profile).
  @IsString()
  @MaxLength(20)
  pro!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  message!: string;
}
