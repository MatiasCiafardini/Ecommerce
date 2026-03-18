import { IsString, IsOptional } from 'class-validator';

export class TrackingEventDto {
  @IsString()
  shipmentId: string;

  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
