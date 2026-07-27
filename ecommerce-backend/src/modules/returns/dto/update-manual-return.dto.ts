import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ADMIN_PAYMENT_METHODS } from '../../../common/manual-payment-methods';
import { CreateManualReturnItemDto } from './create-manual-return.dto';

export class UpdateManualReturnDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsIn([...ADMIN_PAYMENT_METHODS, 'Debito', 'Mercado Pago'])
  returnedPaymentMethod?: string;

  @IsOptional()
  @IsIn([...ADMIN_PAYMENT_METHODS, 'Debito', 'Mercado Pago'])
  settlementMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsBoolean()
  returnedDiscountApplied: boolean;

  @IsBoolean()
  exchangeDiscountApplied: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateManualReturnItemDto)
  returnedItems: CreateManualReturnItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateManualReturnItemDto)
  exchangeItems?: CreateManualReturnItemDto[];
}
