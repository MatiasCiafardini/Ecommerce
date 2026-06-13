import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OpenCashRegisterDto {
  @IsOptional()
  @IsInt()
  storeLocationId?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingAmount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
