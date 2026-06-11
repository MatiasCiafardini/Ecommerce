import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStoreLocationDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  address?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
