import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

const exportStatuses = [
  'all',
  'pending',
  'paid',
  'processing',
  'packed',
  'ready_for_pickup',
  'picked_up',
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

  @ApiPropertyOptional({ example: 'mercadopago' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ example: 'bank_transfer' })
  @IsOptional()
  @IsString()
  method?: string;
}
