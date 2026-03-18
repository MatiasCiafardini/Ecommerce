import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class CreateInventoryDto {

  @ApiProperty({ example: 1 })
  @IsInt()
  variantId: number;

  @ApiProperty({ example: 100 })
  @IsInt()
  quantity: number;

}