import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateManualReturnItemDto {
  @IsInt()
  variantId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;
}

export class CreateManualReturnDto {
  @IsOptional()
  @IsInt()
  storeLocationId?: number;

  @IsOptional()
  @IsInt()
  customerId?: number;

  @IsOptional()
  @IsString()
  customerName?: string;

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
  @IsIn(['Efectivo', 'Tarjeta', 'Transferencia', 'Mercado Pago', 'Cuenta corriente'])
  settlementMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;

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
