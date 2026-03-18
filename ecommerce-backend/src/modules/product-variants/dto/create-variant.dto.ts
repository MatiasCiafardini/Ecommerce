import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsString } from 'class-validator';

export class CreateVariantDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  productId: number;

  @ApiProperty({ example: 'TS-S-BLACK' })
  @IsString()
  sku: string;

  @ApiProperty({ example: 25 })
  @IsNumber()
  price: number;
}
