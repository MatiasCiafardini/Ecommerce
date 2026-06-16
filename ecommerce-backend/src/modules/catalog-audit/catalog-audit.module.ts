import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CatalogAuditService } from './catalog-audit.service';

@Module({
  imports: [PrismaModule],
  providers: [CatalogAuditService],
  exports: [CatalogAuditService],
})
export class CatalogAuditModule {}
