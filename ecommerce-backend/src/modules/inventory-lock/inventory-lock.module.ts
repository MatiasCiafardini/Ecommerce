import { Module } from '@nestjs/common';
import { InventoryLockService } from './inventory-lock.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { InventoryMovementService } from './inventory-movement.service';

@Module({
  imports: [PrismaModule],
  providers: [InventoryLockService, InventoryMovementService],
  exports: [InventoryLockService, InventoryMovementService],
})
export class InventoryLockModule {}
