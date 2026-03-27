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

  @ApiPropertyOptional({ example: 'MICORREO' })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agreement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secretKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  originBranch?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  originAddressId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  senderName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  senderPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  senderEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    example: {
      manualRates: [
        {
          method: 'Correo Argentino · Domicilio · Estandar',
          price: 3500,
          estimatedDays: 4,
        },
      ],
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
