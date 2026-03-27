import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional } from 'class-validator';

export class UpdateProductImageDto {
  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  position?: number;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offsetX?: number;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offsetY?: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  zoom?: number;
}
