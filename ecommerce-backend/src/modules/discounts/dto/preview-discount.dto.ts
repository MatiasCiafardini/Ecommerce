import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class PreviewDiscountDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  subtotal: number;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
