import { IsIn } from 'class-validator';

export class UpdateCashRegisterConfigDto {
  @IsIn(['automatic', 'manual'])
  mode: 'automatic' | 'manual';
}
