import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RemoveProductOptionValueDto {
  @ApiProperty({ example: 'Negro' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
