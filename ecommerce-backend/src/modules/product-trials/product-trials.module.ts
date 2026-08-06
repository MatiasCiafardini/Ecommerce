import { Module } from '@nestjs/common';
import { InventoryLockModule } from '../inventory-lock/inventory-lock.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductTrialsController, ProductTrialsOverviewController } from './product-trials.controller';
import { ProductTrialsService } from './product-trials.service';

@Module({
  imports: [PrismaModule, InventoryLockModule],
  controllers: [ProductTrialsController, ProductTrialsOverviewController],
  providers: [ProductTrialsService],
})
export class ProductTrialsModule {}
