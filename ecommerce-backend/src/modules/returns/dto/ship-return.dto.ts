import { IsOptional, IsString } from 'class-validator';

export class ShipReturnDto {
  @IsOptional()
  @IsString()
  carrier?: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;
}
