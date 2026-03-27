import { Module } from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { DiscountsController } from './discounts.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { DiscountEngineService } from './engine/discount-engine.service';
import { AutomaticDiscountService } from './automatic-discounts/automatic-discount.service';
import { ProductPricingService } from './product-pricing.service';

@Module({
  imports: [PrismaModule],
  controllers: [DiscountsController],
  providers: [
    DiscountsService,
    DiscountEngineService,
    AutomaticDiscountService,
    ProductPricingService,
  ],
  exports: [DiscountsService, DiscountEngineService, ProductPricingService],
})
export class DiscountsModule {}
