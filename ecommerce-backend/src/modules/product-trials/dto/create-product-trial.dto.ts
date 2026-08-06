import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class CreateProductTrialItemDto {
  @IsInt()
  variantId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;
}

export class CreateProductTrialDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProductTrialItemDto)
  items: CreateProductTrialItemDto[];
}
