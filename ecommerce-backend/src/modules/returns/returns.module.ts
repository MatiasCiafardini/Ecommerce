import { Module } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { InventoryLockModule } from '../inventory-lock/inventory-lock.module';
import { MercadoPagoProvider } from '../payments/providers/mercadopago.provider';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, InventoryLockModule, NotificationsModule],
  controllers: [ReturnsController],
  providers: [ReturnsService, MercadoPagoProvider],
})
export class ReturnsModule {}
