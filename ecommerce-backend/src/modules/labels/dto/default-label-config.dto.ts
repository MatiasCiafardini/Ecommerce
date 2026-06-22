import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsObject, IsOptional, Min, ValidateNested } from 'class-validator';
import { LabelOptionsDto } from './generate-labels.dto';
import type { LabelTemplateKey } from '../templates/label-templates';

export type DefaultLabelQuantityMode = 'one' | 'stock';

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

const quantityModes = ['one', 'stock'] as const;

export class DefaultLabelConfigDto {
  @ApiProperty({ enum: templateKeys })
  @IsIn(templateKeys)
  template: LabelTemplateKey;

  @ApiPropertyOptional({ type: LabelOptionsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LabelOptionsDto)
  options?: LabelOptionsDto;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  templateOptions?: Partial<Record<LabelTemplateKey, LabelOptionsDto>>;

  @ApiPropertyOptional({ enum: quantityModes })
  @IsOptional()
  @IsIn(quantityModes)
  quantityMode?: DefaultLabelQuantityMode;
}

export class ProductStockLabelsDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  productId: number;
}
