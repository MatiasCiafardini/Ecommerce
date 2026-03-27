import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ReviewPaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
