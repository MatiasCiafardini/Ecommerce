import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CurrentAccountAddressDto } from './create-current-account.dto';

export class UpdateCurrentAccountDto {
  @IsOptional()
  @IsInt()
  storeLocationId?: number;

  @IsOptional()
  @IsString()
  firstName?: string | null;

  @IsOptional()
  @IsString()
  lastName?: string | null;

  @IsOptional()
  @IsString()
  email?: string | null;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  document?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => CurrentAccountAddressDto)
  address?: CurrentAccountAddressDto;
}
