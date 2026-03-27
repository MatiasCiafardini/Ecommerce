import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateStoreShippingMethodStatusDto {
  @ApiProperty()
  @IsBoolean()
  active!: boolean;
}
