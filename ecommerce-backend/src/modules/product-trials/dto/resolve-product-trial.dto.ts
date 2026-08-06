import { ArrayMinSize, IsArray, IsInt } from 'class-validator';

export class ResolveProductTrialDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  itemIds: number[];
}
