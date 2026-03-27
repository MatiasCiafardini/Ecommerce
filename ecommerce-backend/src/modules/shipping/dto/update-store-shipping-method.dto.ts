import { PartialType } from '@nestjs/swagger';
import { CreateStoreShippingMethodDto } from './create-store-shipping-method.dto';

export class UpdateStoreShippingMethodDto extends PartialType(
  CreateStoreShippingMethodDto,
) {}
