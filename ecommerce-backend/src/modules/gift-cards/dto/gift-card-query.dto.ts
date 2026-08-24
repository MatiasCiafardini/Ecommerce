import { IsIn, IsOptional, IsString } from 'class-validator';

export class GiftCardQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'REDEEMED', 'CANCELLED'])
  status?: 'ACTIVE' | 'REDEEMED' | 'CANCELLED';
}
