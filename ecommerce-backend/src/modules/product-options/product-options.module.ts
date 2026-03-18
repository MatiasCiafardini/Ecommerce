import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductOptionsController } from './product-options.controller';
import { ProductOptionsService } from './product-options.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductOptionsController],
  providers: [ProductOptionsService],
})
export class ProductOptionsModule {}
