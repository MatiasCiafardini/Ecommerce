import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class AdjustCurrentAccountDto {
  @IsOptional()
  @IsInt()
  storeLocationId?: number;

  @IsNumber()
  balance!: number;

  @IsOptional()
  @IsString()
  description?: string;
}
