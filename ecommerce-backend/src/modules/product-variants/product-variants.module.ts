import { Module } from '@nestjs/common';
import { ProductVariantsService } from './product-variants.service';
import { ProductVariantsController } from './product-variants.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CatalogAuditModule } from '../catalog-audit/catalog-audit.module';

@Module({
  imports: [PrismaModule, CatalogAuditModule],
  controllers: [ProductVariantsController],
  providers: [ProductVariantsService],
})
export class ProductVariantsModule {}
