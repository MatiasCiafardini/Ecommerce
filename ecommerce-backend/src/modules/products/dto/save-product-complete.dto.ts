import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SaveProductOptionValueDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  productOptionId: number;

  @ApiProperty({ example: 'Negro' })
  @IsString()
  value: string;
}

class SaveProductVariantDto {
  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiProperty({ example: 'TS-S-BLACK' })
  @IsString()
  sku: string;

  @ApiProperty({ example: 25 })
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ example: 'S' })
  @IsOptional()
  @IsString()
  Size?: string | null;

  @ApiPropertyOptional({ example: 'Black' })
  @IsOptional()
  @IsString()
  Color?: string | null;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  inventoryQuantity?: number;

  @ApiPropertyOptional({ example: 400 })
  @IsOptional()
  @IsNumber()
  weightGrams?: number | null;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  packageWidthCm?: number | null;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  packageHeightCm?: number | null;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  packageLengthCm?: number | null;
}

export class SaveProductCompleteDto {
  @ApiProperty({ example: 'Nike Air Max 90' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Zapatillas deportivas' })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @ApiPropertyOptional({ example: 320 })
  @IsOptional()
  @IsNumber()
  weightGrams?: number | null;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  packageHeightCm?: number | null;

  @ApiPropertyOptional({ example: 28 })
  @IsOptional()
  @IsNumber()
  packageWidthCm?: number | null;

  @ApiPropertyOptional({ example: 36 })
  @IsOptional()
  @IsNumber()
  packageLengthCm?: number | null;

  @ApiPropertyOptional({ example: [1, 2, 3], type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  categoryIds?: number[];

  @ApiPropertyOptional({
    type: [SaveProductOptionValueDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveProductOptionValueDto)
  optionValues?: SaveProductOptionValueDto[];

  @ApiPropertyOptional({
    type: [SaveProductVariantDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveProductVariantDto)
  variants?: SaveProductVariantDto[];
}
