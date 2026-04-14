import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class UpsertStoreShippingProviderConfigDto {
  @ApiProperty({ example: 'correo-argentino' })
  @IsString()
  provider: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    example: 'MICORREO',
    description:
      'Operational mode for the provider. For "correo-argentino" this is resolved globally at platform level and should not be configured per store.',
  })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional({
    description:
      'Store-level credential field used by some providers. Ignored for "correo-argentino", which uses platform-level credentials.',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description:
      'Store-level credential field used by some providers. Ignored for "correo-argentino", which uses platform-level credentials.',
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({
    description:
      'Store-level credential field used by some providers. Ignored for "correo-argentino".',
  })
  @IsOptional()
  @IsString()
  agreement?: string;

  @ApiPropertyOptional({
    description:
      'Store-level credential field used by some providers. Ignored for "correo-argentino", which uses platform-level credentials.',
  })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({
    description:
      'Store-level credential field used by some providers. Ignored for "correo-argentino", which uses platform-level credentials.',
  })
  @IsOptional()
  @IsString()
  secretKey?: string;

  @ApiPropertyOptional({
    description:
      'Optional operational branch/origin reference used by some providers.',
  })
  @IsOptional()
  @IsString()
  originBranch?: string;

  @ApiPropertyOptional({
    description:
      'Optional operational origin address id used by some providers.',
  })
  @IsOptional()
  @IsString()
  originAddressId?: string;

  @ApiPropertyOptional({
    description:
      'Operational sender/contact name for the store. Used by "correo-argentino".',
  })
  @IsOptional()
  @IsString()
  senderName?: string;

  @ApiPropertyOptional({
    description:
      'Operational sender/contact phone for the store. Used by "correo-argentino".',
  })
  @IsOptional()
  @IsString()
  senderPhone?: string;

  @ApiPropertyOptional({
    description:
      'Operational sender/contact email for the store. Used by "correo-argentino".',
  })
  @IsOptional()
  @IsString()
  senderEmail?: string;

  @ApiPropertyOptional({
    description:
      'Operational company name/remitter for the store. Used by "correo-argentino".',
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    description:
      'Per-store operational settings. For "correo-argentino" this is where you should store originAddress, defaultAgency, deliveryTypes, defaultPackageDimensions, pricing, rules and flags.',
    example: {
      originAddress: {
        streetName: 'Av. Siempre Viva',
        streetNumber: '742',
        city: 'Ramos Mejia',
        state: 'Buenos Aires',
        provinceCode: 'B',
        postalCode: '1704',
      },
      defaultAgency: 'B0107',
      deliveryTypes: ['D', 'S'],
      defaultPackageDimensions: {
        height: 10,
        width: 10,
        length: 10,
      },
      pricing: {
        markupType: 'percentage',
        markupValue: 12,
      },
      rules: {
        allowHomeDelivery: true,
        allowBranchDelivery: true,
      },
      flags: {
        autoTrackingEnabled: true,
      },
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
