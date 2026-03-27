import { IsOptional, IsString } from 'class-validator';

export class EnvioPackWebhookDto {
  @IsString()
  id: string;

  @IsString()
  tipo: string;

  @IsOptional()
  @IsString()
  token?: string;
}
