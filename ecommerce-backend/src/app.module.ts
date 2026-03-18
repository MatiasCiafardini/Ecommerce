import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

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
import { OrderManagementModule } from './modules/order-management/order-management.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { EventBusModule } from './modules/event-bus/event-bus.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ProductOptionsModule } from './modules/product-options/product-options.module';

import { ScheduleModule } from '@nestjs/schedule';
import { CustomerAddressesModule } from './modules/customers/customer-addresses/customer-addresses.module';
import { BullModule } from '@nestjs/bullmq';


@Module({
  imports: [
    ScheduleModule.forRoot(),

    BullModule.forRoot({
      connection: {
        host: '127.0.0.1',
        port: 6379,
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
    OrderManagementModule,
    ReturnsModule,
    EventBusModule,
    WebhooksModule,
    CustomerAddressesModule,
    ProductOptionsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(StoreMiddleware).forRoutes('*');
  }
}
