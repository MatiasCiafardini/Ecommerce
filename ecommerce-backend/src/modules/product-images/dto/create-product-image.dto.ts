import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsNumber } from 'class-validator';

export class CreateProductImageDto {
  @ApiProperty({ example: 'https://cdn.store.com/product.jpg' })
  @IsString()
  url: string;

  @ApiProperty({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  position?: number;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offsetX?: number;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offsetY?: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  zoom?: number;
}
