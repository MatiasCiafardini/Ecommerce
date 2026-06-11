import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStoreLocationDto {
  @IsString()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  address?: string;
}
