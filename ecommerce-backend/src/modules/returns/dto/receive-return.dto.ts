import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class ReceiveReturnDto {
  @IsOptional()
  @IsBoolean()
  refundCustomer?: boolean;

  @IsOptional()
  @IsNumber()
  refundAmount?: number;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}
