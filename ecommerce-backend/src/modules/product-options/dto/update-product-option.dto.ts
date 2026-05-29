import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateProductOptionDto {
  @ApiProperty({ example: 'Material' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'color', enum: ['text', 'color', 'number'] })
  @IsOptional()
  @IsString()
  @IsIn(['text', 'color', 'number'])
  attributeType?: string;
}
