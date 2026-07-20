import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  // The login page that sent them tells us which account type to look at, so a
  // shared email address doesn't reset the wrong one.
  @IsOptional()
  @IsIn(['professional', 'customer'])
  kind?: 'professional' | 'customer';
}

export class ResetPasswordDto {
  @IsString()
  @MaxLength(512)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}

export class TokenDto {
  @IsString()
  @MaxLength(512)
  token!: string;
}
