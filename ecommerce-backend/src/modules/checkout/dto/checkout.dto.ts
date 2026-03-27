import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';

class CheckoutAddressSnapshotDto {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty()
  @IsString()
  address1: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address2?: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty()
  @IsString()
  zip: string;

  @ApiProperty()
  @IsString()
  country: string;
}

class CheckoutShippingSelectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  carrierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  carrierName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modalityCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dispatchType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;
}

export class CheckoutDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shippingProvider?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shippingMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippingQuoteId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  shippingCost?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CheckoutAddressSnapshotDto)
  shippingAddress: CheckoutAddressSnapshotDto;

  @ApiPropertyOptional({ type: CheckoutShippingSelectionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CheckoutShippingSelectionDto)
  shippingSelection?: CheckoutShippingSelectionDto;
}
