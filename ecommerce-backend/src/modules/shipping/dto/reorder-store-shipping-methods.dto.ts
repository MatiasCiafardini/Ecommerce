import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, ValidateNested } from 'class-validator';

class ReorderStoreShippingMethodItemDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsInt()
  displayOrder!: number;
}

export class ReorderStoreShippingMethodsDto {
  @ApiProperty({ type: [ReorderStoreShippingMethodItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderStoreShippingMethodItemDto)
  items!: ReorderStoreShippingMethodItemDto[];
}
