import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { RateLimitMiddleware } from './core/middleware/rate-limit.middleware';
import { StoreMiddleware } from './core/middleware/store.middleware';

import { ProductsModule } from './modules/products/products.module';
import { ProductVariantsModule } from './modules/product-variants/product-variants.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AuthModule } from './modules/auth/auth.module';
import { StorefrontModule } from './modules/storefront/storefront.module';
import { ProductImagesModule } from './modules/product-images/product-images.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CustomersModule } from './modules/customers/customers.module';
import { CartModule } from './modules/cart/cart.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { InventoryLockModule } from './modules/inventory-lock/inventory-lock.module';
import { DiscountsModule } from './modules/discounts/discounts.module';
import { FulfillmentModule } from './modules/fulfillment/fulfillment.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { EventBusModule } from './modules/event-bus/event-bus.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ProductOptionsModule } from './modules/product-options/product-options.module';
import { SystemModule } from './modules/system/system.module';
import { LabelsModule } from './modules/labels/labels.module';

import { ScheduleModule } from '@nestjs/schedule';
import { CustomerAddressesModule } from './modules/customers/customer-addresses/customer-addresses.module';
import { BullModule } from '@nestjs/bullmq';
import { runtimeConfig } from './config/runtime-config';
import { PrismaModule } from './prisma/prisma.module';


@Module({
  imports: [
    ScheduleModule.forRoot(),

    BullModule.forRoot({
      connection: {
        host: runtimeConfig.redisHost,
        port: runtimeConfig.redisPort,
      },
    }),

    ProductsModule,
    ProductVariantsModule,
    InventoryModule,
    OrdersModule,
    AuthModule,
    StorefrontModule,
    ProductImagesModule,
    CategoriesModule,
    CustomersModule,
    CartModule,
    CheckoutModule,
    PaymentsModule,
    ShippingModule,
    InventoryLockModule,
    DiscountsModule,
    FulfillmentModule,
    ReturnsModule,
    EventBusModule,
    WebhooksModule,
    CustomerAddressesModule,
    ProductOptionsModule,
    SystemModule,
    LabelsModule,
    PrismaModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RateLimitMiddleware, StoreMiddleware).forRoutes('*');
  }
}
