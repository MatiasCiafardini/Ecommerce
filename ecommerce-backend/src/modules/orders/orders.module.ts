import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CustomerOrdersController } from './customer-orders.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { InventoryLockModule } from '../inventory-lock/inventory-lock.module';

@Module({
  imports: [PrismaModule, InventoryLockModule],
  controllers: [OrdersController, CustomerOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
