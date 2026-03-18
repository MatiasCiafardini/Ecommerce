import { Module } from '@nestjs/common';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [PrismaModule, OrdersModule], // 👈 IMPORTANTE
  controllers: [StorefrontController],
  providers: [StorefrontService],
})
export class StorefrontModule {}
