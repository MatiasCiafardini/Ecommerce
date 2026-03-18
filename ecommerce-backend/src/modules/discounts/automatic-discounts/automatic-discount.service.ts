import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Discount } from '@prisma/client';

@Injectable()
export class AutomaticDiscountService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveAutomaticDiscounts(storeId: number): Promise<Discount[]> {
    const now = new Date();

    return this.prisma.discount.findMany({
      where: {
        storeId,
        automatic: true,
        OR: [
          {
            startsAt: null,
          },
          {
            startsAt: {
              lte: now,
            },
          },
        ],
        AND: [
          {
            OR: [
              {
                endsAt: null,
              },
              {
                endsAt: {
                  gte: now,
                },
              },
            ],
          },
        ],
      },
    });
  }
}
