import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateShipmentDto {
  @IsNumber()
  orderId: number;

  @IsString()
  provider: string;

  @IsString()
  method: string;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsString()
  shippingAddress: string;

  @IsString()
  postalCode: string;
}
