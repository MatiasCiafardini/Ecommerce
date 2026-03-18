import { IsInt, Min } from 'class-validator';

export class ConfirmStockDto {
  @IsInt()
  variantId: number;

  @IsInt()
  @Min(1)
  quantity: number;
}