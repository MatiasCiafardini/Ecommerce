import { IsInt, Min } from 'class-validator';

export class ReleaseStockDto {
  @IsInt()
  variantId: number;

  @IsInt()
  @Min(1)
  quantity: number;
}