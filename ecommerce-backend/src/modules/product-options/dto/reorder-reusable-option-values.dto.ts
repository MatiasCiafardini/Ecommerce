import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class ReorderReusableOptionValuesDto {
  @ApiProperty({ example: [5, 2, 9], type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  valueIds: number[];
}
