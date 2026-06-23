import { IsString } from 'class-validator';

export class CancelCurrentAccountPaymentDto {
  @IsString()
  reason: string;
}
