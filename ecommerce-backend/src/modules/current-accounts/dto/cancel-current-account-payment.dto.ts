import { IsOptional, IsString } from 'class-validator';

export class CancelCurrentAccountPaymentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
