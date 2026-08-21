import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CatalogAuditModule } from '../catalog-audit/catalog-audit.module';
import { InventoryLockModule } from '../inventory-lock/inventory-lock.module';

@Module({
  imports: [PrismaModule, CatalogAuditModule, InventoryLockModule],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
