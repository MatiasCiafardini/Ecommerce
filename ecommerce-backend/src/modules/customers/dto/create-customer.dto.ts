import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';

class CreateCustomerOptionalAddressDto {
  @ApiProperty({ example: 'Av. Corrientes 1234', required: false })
  @IsOptional()
  @IsString()
  address1?: string;

  @ApiProperty({ example: 'Piso 2 Depto B', required: false })
  @IsOptional()
  @IsString()
  address2?: string;

  @ApiProperty({ example: 'CABA', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'Buenos Aires', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: '1405', required: false })
  @IsOptional()
  @IsString()
  zip?: string;
}

export class CreateCustomerDto {
  @ApiProperty({ example: 'juan@gmail.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'Juan', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Perez', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: '+5491122334455', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '30123456', required: false })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiProperty({ example: 'Cliente de mostrador', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: 'current_account', required: false })
  @IsOptional()
  @IsIn(['storefront', 'current_account', 'admin'])
  source?: string;

  @ApiProperty({ required: false, type: CreateCustomerOptionalAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCustomerOptionalAddressDto)
  address?: CreateCustomerOptionalAddressDto;
}
