import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CatalogAuditModule } from '../catalog-audit/catalog-audit.module';

@Module({
  imports: [PrismaModule, CatalogAuditModule],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
