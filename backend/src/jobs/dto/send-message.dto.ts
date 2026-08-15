import { IsString, MaxLength, MinLength } from 'class-validator';

export class ProSendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;
}

// The customer picks which pro's thread they're posting to by publicId.
export class CustomerSendMessageDto extends ProSendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  pro!: string;
}
