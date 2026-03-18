import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DiscountType } from '@prisma/client';

type AutomaticDiscountResult = {
  discountId: number;
  discountAmount: number;
  freeShipping: boolean;
};

@Injectable()
export class DiscountEngineService {
  constructor(private prisma: PrismaService) {}

  async calculateAutomaticDiscount({
    storeId,
    subtotal,
  }: {
    storeId: number;
    subtotal: number;
  }): Promise<AutomaticDiscountResult | null> {
    const now = new Date();

    const discounts = await this.prisma.discount.findMany({
      where: {
        storeId,
        automatic: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [
          {
            OR: [{ endsAt: null }, { endsAt: { gte: now } }],
          },
        ],
      },
    });

    if (!discounts.length) return null;

    let bestDiscount: {
      discountId: number;
      discountAmount: number;
      freeShipping: boolean;
    } | null = null;

    for (const discount of discounts) {
      if (discount.minimumAmount && subtotal < discount.minimumAmount) {
        continue;
      }

      let discountAmount = 0;
      let freeShipping = false;

      switch (discount.type) {
        case DiscountType.percentage:
          discountAmount = subtotal * ((discount.value ?? 0) / 100);
          break;

        case DiscountType.fixed_amount:
          discountAmount = discount.value ?? 0;
          break;

        case DiscountType.free_shipping:
          freeShipping = true;
          break;
      }

      if (!bestDiscount || discountAmount > bestDiscount.discountAmount) {
        bestDiscount = {
          discountId: discount.id,
          discountAmount,
          freeShipping,
        };
      }
    }

    return bestDiscount;
  }
}
