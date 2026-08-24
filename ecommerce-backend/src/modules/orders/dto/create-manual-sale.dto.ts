import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateManualSaleItemDto {
  @IsInt()
  variantId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  enteredPrice?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  catalogPrice?: number;

  @IsOptional()
  @IsString()
  giftCardPurchaserName?: string;

  @IsOptional()
  @IsEmail()
  giftCardPurchaserEmail?: string;

  @IsOptional()
  @IsString()
  giftCardPurchaserPhone?: string;

  @IsOptional()
  @IsString()
  giftCardRecipientName?: string;

  @IsOptional()
  @IsEmail()
  giftCardRecipientEmail?: string;

  @IsOptional()
  @IsString()
  giftCardRecipientPhone?: string;

  @IsOptional()
  @IsString()
  giftCardMessage?: string;

  @IsOptional()
  @IsISO8601()
  giftCardExpiresAt?: string;
}

export class GiftCardApplicationDto {
  @IsInt()
  giftCardId: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;
}

export class CreateManualSalePaymentDto {
  @IsString()
  method: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;
}

export class CreateManualSaleDto {
  @IsOptional()
  @IsInt()
  storeLocationId?: number;

  @IsOptional()
  @IsInt()
  customerId?: number;

  @IsOptional()
  @IsString()
  customerFirstName?: string;

  @IsOptional()
  @IsString()
  customerLastName?: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  shippingMethod?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  shippingCost?: number;

  @IsOptional()
  @IsIn(['percentage', 'fixed'])
  discountType?: 'percentage' | 'fixed';

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  appliedCurrentAccountCreditAmount?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateManualSalePaymentDto)
  payments?: CreateManualSalePaymentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GiftCardApplicationDto)
  giftCardApplications?: GiftCardApplicationDto[];

  @IsOptional()
  @IsIn(['approved', 'pending'])
  paymentStatus?: 'approved' | 'pending';

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(['cash', 'card'])
  manualPriceMode?: 'cash' | 'card';

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  trialItemIds?: number[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateManualSaleItemDto)
  items: CreateManualSaleItemDto[];
}
