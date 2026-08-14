import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CustomerSignupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  // Optional — low-friction signup only needs an email. When a customer skips
  // it, professionals reach them by email until they add a number later.
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  @Matches(/^[+0-9 ()-]+$/, { message: 'invalid_phone' })
  phone?: string;

  @IsOptional()
  @IsIn(['person', 'business'])
  type?: 'person' | 'business';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyName?: string;
}
