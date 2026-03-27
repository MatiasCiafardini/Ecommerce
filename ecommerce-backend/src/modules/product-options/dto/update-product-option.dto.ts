import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateProductOptionDto {
  @ApiProperty({ example: 'Material' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
