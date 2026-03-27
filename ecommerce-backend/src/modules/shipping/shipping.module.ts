import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { PrismaModule } from '../../prisma/prisma.module';

import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { EnvioPackWebhookController } from './controllers/enviopack-webhook.controller';
import { AdminShippingProviderConfigController } from './controllers/admin-shipping-provider-config.controller';
import { AdminStoreShippingMethodsController } from './controllers/admin-store-shipping-methods.controller';

import { MockShippingProvider } from './providers/mock.provider';
import { ManualShippingProvider } from './providers/manual.provider';
import { EnvioPackProvider } from './providers/enviopack.provider';
import { CorreoArgentinoProvider } from './providers/correo-argentino.provider';
import { EnvioPackWebhookService } from './services/enviopack-webhook.service';
import { EnvioPackWebhookProcessor } from './workers/enviopack-webhook.processor';
import { ShippingProvidersRegistryService } from './services/shipping-providers-registry.service';
import { StoreShippingProviderConfigService } from './services/store-shipping-provider-config.service';
import { ShippingQuotesService } from './services/shipping-quotes.service';
import { StoreShippingMethodsService } from './services/store-shipping-methods.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'enviopack-webhooks',
    }),
  ],
  controllers: [
    ShippingController,
    EnvioPackWebhookController,
    AdminShippingProviderConfigController,
    AdminStoreShippingMethodsController,
  ],
  providers: [
    StoreShippingMethodsService,
    ManualShippingProvider,
    MockShippingProvider,
    EnvioPackProvider,
    CorreoArgentinoProvider,
    ShippingService,
    EnvioPackWebhookService,
    EnvioPackWebhookProcessor,
    ShippingProvidersRegistryService,
    StoreShippingProviderConfigService,
    ShippingQuotesService,
  ],
  exports: [
    ShippingService,
    ShippingProvidersRegistryService,
    StoreShippingProviderConfigService,
    ShippingQuotesService,
    StoreShippingMethodsService,
  ],
})
export class ShippingModule {}
