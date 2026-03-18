import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';

@Injectable()
export class DiscountsService {
  constructor(private prisma: PrismaService) {}

  async create(storeId: number, dto: CreateDiscountDto) {
    return this.prisma.discount.create({
      data: {
        storeId,
        name: dto.name,
        type: dto.type,
        value: dto.value,
        minimumAmount: dto.minimumAmount,
        automatic: dto.automatic ?? false,
      },
    });
  }

  async findAll(storeId: number) {
    return this.prisma.discount.findMany({
      where: {
        storeId,
      },
      include: {
        coupons: true,
      },
    });
  }

  async applyCoupon(storeId: number, code: string, subtotal: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: {
        code,
      },
      include: {
        discount: true,
      },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    const discount = coupon.discount;

    if (!discount) {
      throw new NotFoundException('Discount not found for this coupon');
    }

    if (discount.storeId !== storeId) {
      throw new BadRequestException('Coupon invalid for this store');
    }

    const now = new Date();

    if (discount.startsAt && discount.startsAt > now) {
      throw new BadRequestException('Coupon not active yet');
    }

    if (discount.endsAt && discount.endsAt < now) {
      throw new BadRequestException('Coupon expired');
    }

    if (discount.minimumAmount && subtotal < discount.minimumAmount) {
      throw new BadRequestException('Minimum order amount not reached');
    }

    // 🚨 USAGE LIMIT CHECK
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    let discountAmount = 0;

    const value = discount.value ?? 0;

    if (discount.type === 'percentage') {
      discountAmount = subtotal * (value / 100);
    }

    if (discount.type === 'fixed_amount') {
      discountAmount = value;
    }

    return {
      discountId: discount.id,
      couponId: coupon.id,
      code: coupon.code,
      amount: discountAmount,
      freeShipping: discount.type === 'free_shipping',
    };
  }
}
