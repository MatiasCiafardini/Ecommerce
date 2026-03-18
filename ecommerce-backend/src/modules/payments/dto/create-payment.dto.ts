import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsString()
  paymentMethodId: string;

  @ApiProperty()
  @IsInt()
  installments: number;

  @ApiProperty()
  @IsString()
  issuerId: string;

  @ApiProperty()
  @IsString()
  idempotencyKey: string;
}
