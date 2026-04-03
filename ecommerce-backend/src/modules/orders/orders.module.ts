import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CustomerOrdersController } from './customer-orders.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { InventoryLockModule } from '../inventory-lock/inventory-lock.module';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';
import { MercadoPagoProvider } from '../payments/providers/mercadopago.provider';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    InventoryLockModule,
    FulfillmentModule,
    NotificationsModule,
  ],
  controllers: [OrdersController, CustomerOrdersController],
  providers: [OrdersService, MercadoPagoProvider],
  exports: [OrdersService],
})
export class OrdersModule {}
