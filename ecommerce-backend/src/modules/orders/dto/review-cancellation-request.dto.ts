import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ReviewCancellationRequestDto {
  @IsBoolean()
  approve: boolean;

  @IsOptional()
  @IsString()
  adminNotes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  refundAmount?: number;
}
