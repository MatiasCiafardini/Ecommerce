import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CheckProductSkuCandidateDto {
  @IsString()
  sku: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  excludeVariantId?: number;
}

export class CheckProductSkusDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(250)
  @ValidateNested({ each: true })
  @Type(() => CheckProductSkuCandidateDto)
  candidates: CheckProductSkuCandidateDto[];
}
