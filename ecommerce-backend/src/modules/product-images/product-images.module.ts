import { Module } from '@nestjs/common';
import { ProductImagesController } from './product-images.controller';
import { ProductImagesService } from './product-images.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CatalogAuditModule } from '../catalog-audit/catalog-audit.module';

@Module({
  imports: [PrismaModule, CatalogAuditModule],
  controllers: [ProductImagesController],
  providers: [ProductImagesService],
})
export class ProductImagesModule {}
