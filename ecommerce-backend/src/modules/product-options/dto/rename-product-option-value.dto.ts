import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RenameProductOptionValueDto {
  @ApiProperty({ example: 'Negro' })
  @IsString()
  @IsNotEmpty()
  currentValue: string;

  @ApiProperty({ example: 'Negro intenso' })
  @IsString()
  @IsNotEmpty()
  nextValue: string;
}
