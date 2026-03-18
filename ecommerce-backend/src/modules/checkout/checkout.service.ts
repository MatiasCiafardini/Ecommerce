import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';
import { InventoryLockService } from '../inventory-lock/inventory-lock.service';
import { DiscountsService } from '../discounts/discounts.service';
import { DiscountEngineService } from '../discounts/engine/discount-engine.service';

@Injectable()
export class CheckoutService {
  constructor(
    private prisma: PrismaService,
    private inventoryLockService: InventoryLockService,
    private discountsService: DiscountsService,
    private discountEngine: DiscountEngineService,
  ) {}

  async checkout(storeId: number, cartId: number, dto: CheckoutDto) {
    const {
      customerId,
      shippingProvider,
      shippingMethod,
      shippingCost,
      couponCode,
      idempotencyKey,
    } = dto;

    if (idempotencyKey) {
      const existingOrder = await this.prisma.order.findFirst({
        where: {
          storeId,
          idempotencyKey,
        },
      });

      if (existingOrder) {
        return existingOrder;
      }
    }

    await this.ensureCustomer(storeId, customerId);

    const cart = await this.prisma.cart.findUnique({
      where: {
        id: cartId,
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                inventories: {
                  where: {
                    storeId,
                  },
                },
                product: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.storeId !== storeId) {
      throw new NotFoundException('Cart not found');
    }

    if (cart.customerId !== customerId) {
      throw new ForbiddenException('Cart does not belong to this customer');
    }

    if (!cart.items.length) {
      throw new BadRequestException('Cart is empty');
    }

    let subtotal = 0;

    for (const item of cart.items) {
      const inventory = item.variant.inventories[0];
      const available = (inventory?.quantity || 0) - (inventory?.reserved || 0);

      if (item.quantity > available) {
        throw new BadRequestException(
          `Not enough stock for ${item.variant.product.title}`,
        );
      }

      subtotal += Number(item.variant.price) * item.quantity;
    }

    let discountAmount = 0;
    let discountId: number | null = null;
    let discountCode: string | null = null;
    let freeShipping = false;

    let couponDiscount: {
      couponId: number;
      discountId: number;
      code: string;
      amount: number;
      freeShipping: boolean;
    } | null = null;

    if (couponCode) {
      couponDiscount = await this.discountsService.applyCoupon(
        storeId,
        couponCode,
        subtotal,
      );
    }

    const automaticDiscount: {
      discountId: number;
      discountAmount: number;
      freeShipping: boolean;
    } | null = await this.discountEngine.calculateAutomaticDiscount({
      storeId,
      subtotal,
    });

    if (couponDiscount && automaticDiscount) {
      if (couponDiscount.amount >= automaticDiscount.discountAmount) {
        discountAmount = couponDiscount.amount;
        discountId = couponDiscount.discountId;
        discountCode = couponDiscount.code;
        freeShipping = couponDiscount.freeShipping;
      } else {
        discountAmount = automaticDiscount.discountAmount;
        discountId = automaticDiscount.discountId;
        freeShipping = automaticDiscount.freeShipping;
      }
    } else if (couponDiscount) {
      discountAmount = couponDiscount.amount;
      discountId = couponDiscount.discountId;
      discountCode = couponDiscount.code;
      freeShipping = couponDiscount.freeShipping;
    } else if (automaticDiscount) {
      discountAmount = automaticDiscount.discountAmount;
      discountId = automaticDiscount.discountId;
      freeShipping = automaticDiscount.freeShipping;
    }

    let finalShippingCost = Number(shippingCost ?? 0);

    if (freeShipping) {
      finalShippingCost = 0;
    }

    const total = subtotal - discountAmount + finalShippingCost;

    return this.prisma.$transaction(async (tx) => {
      for (const item of cart.items) {
        await this.inventoryLockService.reserveStockTx(
          tx,
          storeId,
          item.variantId,
          item.quantity,
        );
      }

      const order = await tx.order.create({
        data: {
          storeId,
          customerId,
          subtotal,
          discountAmount,
          discountCode,
          discountId,
          total,
          status: 'pending',
          shippingProvider,
          shippingMethod,
          shippingCost: finalShippingCost,
          idempotencyKey: idempotencyKey ?? null,
        },
      });

      for (const item of cart.items) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            variantId: item.variantId,
            quantity: item.quantity,
            price: Number(item.variant.price),
          },
        });
      }

      if (couponDiscount?.couponId) {
        await tx.coupon.update({
          where: {
            id: couponDiscount.couponId,
          },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        });
      }

      await tx.cartItem.deleteMany({
        where: {
          cartId,
        },
      });

      return order;
    });
  }

  private async ensureCustomer(storeId: number, customerId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        storeId,
      },
      select: { id: true },
    });

    if (!customer) {
      throw new ForbiddenException('Customer does not belong to this store');
    }
  }
}
