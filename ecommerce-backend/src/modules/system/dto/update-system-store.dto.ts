import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateSystemStoreDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  domain?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  theme?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  tagline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  supportPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  heroTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  heroSubtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  accentColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  accentStrongColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  backgroundColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  panelColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  mercadoPagoPublicKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  mercadoPagoAccessToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  mercadoPagoWebhookSecret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  ownerName?: string;

  @IsOptional()
  @IsEmail()
  ownerEmail?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  ownerPassword?: string;

  @IsOptional()
  @IsBoolean()
  manualSalesEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  bankTransferAlias?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  bankTransferDiscountPercentage?: number;
}
