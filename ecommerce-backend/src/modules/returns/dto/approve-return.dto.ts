import { IsBoolean, IsOptional, IsNumber } from 'class-validator';

export class ApproveReturnDto {
  @IsBoolean()
  approve: boolean;

  @IsOptional()
  @IsNumber()
  refundAmount?: number;
}
