import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

const exportStatuses = [
  'all',
  'pending',
  'paid',
  'processing',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;

export class ExportAccountingDto {
  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-04-30' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ enum: exportStatuses, example: 'all' })
  @IsOptional()
  @IsIn(exportStatuses)
  status?: (typeof exportStatuses)[number];
}
