import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CURRENT_ACCOUNT_PAYMENT_METHODS } from '../../../common/manual-payment-methods';

export class UpdateCurrentAccountPaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsString()
  @IsIn([...CURRENT_ACCOUNT_PAYMENT_METHODS, 'Debito'])
  paymentMethod: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
