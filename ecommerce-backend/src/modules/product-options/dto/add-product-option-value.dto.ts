import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class AddProductOptionValueDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  productOptionId: number;

  @ApiProperty({ example: 'Unisex' })
  @IsString()
  @IsNotEmpty()
  value: string;
}
