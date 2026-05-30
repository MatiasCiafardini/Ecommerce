import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Zapatillas' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Prendas livianas para todos los dias' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'active', enum: ['active', 'hidden'] })
  @IsOptional()
  @IsIn(['active', 'hidden'])
  status?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  parentId?: number | null;

  @ApiPropertyOptional({ example: '/uploads/category.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
