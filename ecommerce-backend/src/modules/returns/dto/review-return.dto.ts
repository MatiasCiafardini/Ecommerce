import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ReviewReturnDto {
  @IsBoolean()
  approve: boolean;

  @IsOptional()
  @IsString()
  adminInstructions?: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}
