import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetStoreProductsDto {
  @ApiPropertyOptional({
    example: '1,2,3',
    description:
      'Comma separated ProductOptionValue ids. Values from different options are combined with AND, values from the same option with OR.',
  })
  @IsOptional()
  @IsString()
  optionValueIds?: string;
}
