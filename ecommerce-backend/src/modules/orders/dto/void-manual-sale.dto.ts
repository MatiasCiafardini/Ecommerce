import { IsString, MinLength } from 'class-validator';

export class VoidManualSaleDto {
  @IsString()
  @MinLength(3)
  reason: string;
}
