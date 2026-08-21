import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CatalogAuditModule } from '../catalog-audit/catalog-audit.module';
import { InventoryLockModule } from '../inventory-lock/inventory-lock.module';

@Module({
  imports: [PrismaModule, CatalogAuditModule, InventoryLockModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
