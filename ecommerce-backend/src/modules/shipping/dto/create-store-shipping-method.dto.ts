import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

const STORE_SHIPPING_METHOD_TYPES = [
  'pickup',
  'manual',
  'free',
  'coordinar',
  'integration',
] as const;

export class CreateStoreShippingMethodDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: STORE_SHIPPING_METHOD_TYPES })
  @IsString()
  @IsIn(STORE_SHIPPING_METHOD_TYPES)
  type!: 'pickup' | 'manual' | 'free' | 'coordinar' | 'integration';

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  freeShippingMinimumAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pickupAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pickupHours?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pickupInstructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  displayOrder?: number;
}
