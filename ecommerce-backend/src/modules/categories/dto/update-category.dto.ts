import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Remeras premium' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '/images/seed-categories/remeras.svg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
