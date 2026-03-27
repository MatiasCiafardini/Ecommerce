import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { InventoryLockModule } from '../inventory-lock/inventory-lock.module';
import { DiscountsModule } from '../discounts/discounts.module';
import { ShippingModule } from '../shipping/shipping.module';

@Module({
  imports: [PrismaModule, InventoryLockModule, DiscountsModule, ShippingModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
