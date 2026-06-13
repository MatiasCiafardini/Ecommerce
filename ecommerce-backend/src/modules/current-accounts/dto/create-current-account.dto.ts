import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CurrentAccountAddressDto {
  @IsOptional()
  @IsString()
  address1?: string;

  @IsOptional()
  @IsString()
  address2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zip?: string;
}

export class CreateCurrentAccountDto {
  @IsOptional()
  @IsInt()
  storeLocationId?: number;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CurrentAccountAddressDto)
  address?: CurrentAccountAddressDto;
}
