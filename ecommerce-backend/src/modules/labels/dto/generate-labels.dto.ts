import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
  Min,
} from 'class-validator';
import type { LabelTemplateKey } from '../templates/label-templates';

const templateKeys = [
  'BROTHER_QL570_62X29_CLOTHING',
  'BROTHER_QL570_54X17_ACCESSORY',
  'BROTHER_DK2205_SHIPPING',
  'BROTHER_QL570_29X90',
  'TROJANI_100X150_6UP',
  'A4_50x25',
  'A4_40x30',
  'THERMAL_58',
  'THERMAL_80',
] as const;
const priceModes = ['normal', 'transfer', 'both', 'none'] as const;

export class LabelItemDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  variantId: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  quantity: number;
}

export class LabelOptionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showPrice?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showStoreName?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showProductName?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showVariantName?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showSku?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showLogo?: boolean;

  @ApiPropertyOptional({ enum: priceModes })
  @IsOptional()
  @IsString()
  @IsIn(priceModes)
  priceMode?: (typeof priceModes)[number];
}

export class GenerateLabelsDto {
  @ApiProperty({ type: [LabelItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabelItemDto)
  items: LabelItemDto[];

  @ApiProperty({ enum: templateKeys })
  @IsIn(templateKeys)
  template: LabelTemplateKey;

  @ApiPropertyOptional({ type: LabelOptionsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LabelOptionsDto)
  options?: LabelOptionsDto;
}
