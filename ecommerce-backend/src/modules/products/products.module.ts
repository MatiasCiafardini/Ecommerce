import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CatalogAuditModule } from '../catalog-audit/catalog-audit.module';

@Module({
  imports: [PrismaModule, CatalogAuditModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
