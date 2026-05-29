import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateReusableOptionValueDto {
  @ApiProperty({ example: 'Negro' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({ example: '#111111' })
  @IsOptional()
  @IsString()
  visualColor?: string | null;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  position?: number;
}
