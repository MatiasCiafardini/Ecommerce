import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  Min,
  ArrayUnique,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountScope, DiscountType } from '@prisma/client';

class DiscountOptionValueTargetDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  productOptionId: number;

  @IsString()
  value: string;
}

export class CreateDiscountDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(DiscountScope)
  scope?: DiscountScope;

  @IsEnum(DiscountType)
  type: DiscountType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumAmount?: number;

  @IsOptional()
  @IsBoolean()
  automatic?: boolean;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  couponUsageLimit?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  productIds?: number[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  categoryIds?: number[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  variantIds?: number[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  optionIds?: number[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiscountOptionValueTargetDto)
  optionValueTargets?: DiscountOptionValueTargetDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(2)
  buyQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  getQuantity?: number;
}
