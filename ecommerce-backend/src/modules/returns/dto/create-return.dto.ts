import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateReturnItemDto {
  @IsInt()
  orderItemId: number;

  @IsInt()
  quantity: number;
}

export class CreateReturnDto {
  @IsInt()
  orderId: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsArray()
  items: CreateReturnItemDto[];
}
