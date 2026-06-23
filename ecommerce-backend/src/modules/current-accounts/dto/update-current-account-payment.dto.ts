import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCurrentAccountPaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsString()
  @IsIn(['Efectivo', 'Tarjeta', 'Transferencia', 'Mercado Pago'])
  paymentMethod: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  reason: string;
}
