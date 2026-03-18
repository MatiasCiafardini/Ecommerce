import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';

import { MockShippingProvider } from './providers/mock.provider';
import { EnvioPackProvider } from './providers/enviopack.provider';

@Module({
  imports: [PrismaModule],
  controllers: [ShippingController],
  providers: [
    ShippingService,
    {
      provide: 'ShippingProvider',
      useClass:
        process.env.NODE_ENV === 'production'
          ? EnvioPackProvider
          : MockShippingProvider,
    },
  ],
  exports: [ShippingService],
})
export class ShippingModule {}
