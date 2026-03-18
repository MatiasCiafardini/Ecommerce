import { Module } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { InventoryLockModule } from '../inventory-lock/inventory-lock.module';
import { MercadoPagoProvider } from '../payments/providers/mercadopago.provider';

@Module({
  imports: [PrismaModule, InventoryLockModule],
  controllers: [ReturnsController],
  providers: [ReturnsService, MercadoPagoProvider],
})
export class ReturnsModule {}
