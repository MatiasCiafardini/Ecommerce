import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class CreateStoreOrderItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  variantId: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  quantity: number;
}

export class CreateStoreOrderDto {
  @ApiProperty({ type: [CreateStoreOrderItemDto] })
  @IsArray()
  items: CreateStoreOrderItemDto[];
}
