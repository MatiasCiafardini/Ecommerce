import { IsNumber, IsString, Min, MinLength } from 'class-validator';

export class AdjustGiftCardDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  balance: number;

  @IsString()
  @MinLength(3)
  reason: string;
}
