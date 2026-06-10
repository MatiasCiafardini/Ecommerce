import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AdjustCurrentAccountDto {
  @IsNumber()
  balance!: number;

  @IsOptional()
  @IsString()
  description?: string;
}
