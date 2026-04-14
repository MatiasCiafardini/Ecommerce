import { Module } from '@nestjs/common';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';
import { DiscountsModule } from '../discounts/discounts.module';
import { MercadoPagoProvider } from '../payments/providers/mercadopago.provider';
import { ShippingModule } from '../shipping/shipping.module';

@Module({
  imports: [PrismaModule, OrdersModule, DiscountsModule, ShippingModule],
  controllers: [StorefrontController],
  providers: [StorefrontService, MercadoPagoProvider],
})
export class StorefrontModule {}
