import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateProductOptionDto {
  @ApiProperty({ example: 'Genero' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
