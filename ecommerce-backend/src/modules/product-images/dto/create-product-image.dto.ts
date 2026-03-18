import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateProductImageDto {
  @ApiProperty({ example: 'https://cdn.store.com/product.jpg' })
  @IsString()
  url: string;

  @ApiProperty({ example: 0 })
  @IsOptional()
  @IsInt()
  position?: number;
}
