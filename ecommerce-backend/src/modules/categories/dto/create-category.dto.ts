import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Zapatillas' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '/images/seed-categories/remeras.svg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
