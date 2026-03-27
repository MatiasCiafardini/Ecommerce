import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @ApiPropertyOptional({
    description: 'Proveedor de pago',
    example: 'mercadopago',
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({
    description: 'Metodo interno del pago',
    example: 'credit_card',
  })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  installments?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issuerId?: string;

  @ApiProperty()
  @IsString()
  idempotencyKey: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
