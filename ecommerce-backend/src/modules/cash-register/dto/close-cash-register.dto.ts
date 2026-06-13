import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseCashRegisterDto {
  @IsOptional()
  @IsInt()
  storeLocationId?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  closingAmount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
