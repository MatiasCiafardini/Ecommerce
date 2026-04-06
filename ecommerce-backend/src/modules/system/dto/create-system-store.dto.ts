import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSystemStoreDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(3)
  domain: string;

  @IsEmail()
  ownerEmail: string;

  @IsString()
  @MinLength(8)
  ownerPassword: string;

  @IsOptional()
  @IsString()
  ownerName?: string;
}
