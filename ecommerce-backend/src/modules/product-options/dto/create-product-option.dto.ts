import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProductOptionDto {
  @ApiProperty({ example: 'Genero' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'text', enum: ['text', 'color', 'number'] })
  @IsOptional()
  @IsString()
  @IsIn(['text', 'color', 'number'])
  attributeType?: string;
}
