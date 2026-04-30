import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetStoreProductsDto {
  @ApiPropertyOptional({
    example: 'lino',
    description:
      'Text search over product title, slug, description, categories and option values.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: '1,2,3',
    description: 'Comma separated product ids to force a curated product selection.',
  })
  @IsOptional()
  @IsString()
  productIds?: string;

  @ApiPropertyOptional({
    example: '1,2,3',
    description:
      'Comma separated ProductOptionValue ids. Values from different options are combined with AND, values from the same option with OR.',
  })
  @IsOptional()
  @IsString()
  optionValueIds?: string;
}
