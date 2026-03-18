import { Module } from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { DiscountsController } from './discounts.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { DiscountEngineService } from './engine/discount-engine.service';
import { AutomaticDiscountService } from './automatic-discounts/automatic-discount.service';

@Module({
  imports: [PrismaModule],
  controllers: [DiscountsController],
  providers: [
    DiscountsService,
    DiscountEngineService,
    AutomaticDiscountService,
  ],
  exports: [DiscountsService, DiscountEngineService],
})
export class DiscountsModule {}
