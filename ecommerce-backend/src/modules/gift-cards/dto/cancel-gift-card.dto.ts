import { IsString, MinLength } from 'class-validator';

export class CancelGiftCardDto {
  @IsString()
  @MinLength(3)
  reason: string;
}
