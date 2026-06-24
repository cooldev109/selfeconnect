import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateContactDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  // Mirrors the frontend rule: 6–20 chars, digits/spaces and + ( ) - only.
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  @Matches(/^[+0-9 ()-]+$/, {
    message: 'phone may contain only digits, spaces and + ( ) -',
  })
  phone?: string;
}
