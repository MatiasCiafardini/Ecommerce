import { PartialType } from '@nestjs/swagger';

import { UpsertStoreShippingProviderConfigDto } from './upsert-store-shipping-provider-config.dto';

export class UpdateStoreShippingProviderConfigDto extends PartialType(
  UpsertStoreShippingProviderConfigDto,
) {}
