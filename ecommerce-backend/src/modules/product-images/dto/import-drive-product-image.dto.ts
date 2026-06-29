import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ImportDriveProductImageItemDto {
  @IsString()
  fileId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  position?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offsetX?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offsetY?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  zoom?: number;
}

export class ImportDriveProductImageDto {
  @IsString()
  accessToken: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ImportDriveProductImageItemDto)
  files: ImportDriveProductImageItemDto[];
}
