import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

const STORE_SHIPPING_METHOD_TYPES = ['pickup', 'manual', 'free', 'coordinar'] as const;

export class CreateStoreShippingMethodDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: STORE_SHIPPING_METHOD_TYPES })
  @IsString()
  @IsIn(STORE_SHIPPING_METHOD_TYPES)
  type!: 'pickup' | 'manual' | 'free' | 'coordinar';

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  displayOrder?: number;
}
