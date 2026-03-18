import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';

export class CheckoutDto {
  @ApiProperty()
  @IsNumber()
  customerId: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shippingProvider?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shippingMethod?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  shippingCost?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
