import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import { InventoryLockModule } from '../inventory-lock/inventory-lock.module';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';

@Module({
  imports: [PrismaModule, InventoryLockModule, FulfillmentModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, MercadoPagoProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
