import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

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

  @ApiPropertyOptional({ example: 'S' })
  @IsOptional()
  @IsString()
  Size?: string;

  @ApiPropertyOptional({ example: 'Black' })
  @IsOptional()
  @IsString()
  Color?: string;

  @ApiPropertyOptional({ example: 0.4 })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ example: 400 })
  @IsOptional()
  @IsNumber()
  weightGrams?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  packageWidthCm?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  packageHeightCm?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  length?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  packageLengthCm?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  inventoryQuantity?: number;
}
