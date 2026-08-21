import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsIn, IsInt, Min } from 'class-validator';
import { PRODUCT_INVENTORY_POLICIES, type ProductInventoryPolicy } from '../../../common/inventory-types';

export class CreateProductDto {
  @ApiPropertyOptional({ enum: PRODUCT_INVENTORY_POLICIES, default: 'RESTOCK' })
  @IsOptional()
  @IsIn(PRODUCT_INVENTORY_POLICIES)
  inventoryPolicy?: ProductInventoryPolicy;

  @ApiPropertyOptional({ example: 3, default: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @ApiProperty({ example: 'Nike Air Max 90' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Nike' })
  @IsOptional()
  @IsString()
  brand?: string | null;

  @ApiProperty({ example: 'Zapatillas deportivas' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @ApiPropertyOptional({ example: 320 })
  @IsOptional()
  @IsNumber()
  weightGrams?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  packageHeightCm?: number;

  @ApiPropertyOptional({ example: 28 })
  @IsOptional()
  @IsNumber()
  packageWidthCm?: number;

  @ApiPropertyOptional({ example: 36 })
  @IsOptional()
  @IsNumber()
  packageLengthCm?: number;

  @ApiPropertyOptional({ example: 'small-bag' })
  @IsOptional()
  @IsString()
  packagingTemplateId?: string | null;
}
