import { Module } from '@nestjs/common';
import { InventoryLockService } from './inventory-lock.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [InventoryLockService],
  exports: [InventoryLockService],
})
export class InventoryLockModule {}
