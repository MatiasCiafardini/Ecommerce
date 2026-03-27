import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateStoreShippingProviderStatusDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}
