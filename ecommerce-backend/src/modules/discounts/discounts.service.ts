import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Discount, DiscountScope, DiscountType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { DiscountEngineService } from './engine/discount-engine.service';
import { PreviewDiscountDto } from './dto/preview-discount.dto';
import { roundCurrency } from '../../common/currency';
import {
  resolveStorePricingPolicy,
  resolveTransferPrice,
} from '../../common/price-input-mode';

@Injectable()
export class DiscountsService {
  constructor(
    private prisma: PrismaService,
    private discountEngine: DiscountEngineService,
  ) {}

  async create(storeId: number, dto: CreateDiscountDto) {
    const normalized = await this.normalizeDiscountInput(storeId, dto);

    return this.prisma.$transaction(async (tx) => {
      const discount = await tx.discount.create({
        data: {
          storeId,
          name: dto.name,
          scope: normalized.scope,
          type: dto.type,
          value: dto.type === DiscountType.buy_x_get_y ? null : dto.value,
          minimumAmount: dto.minimumAmount,
          automatic: normalized.automatic,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
          buyQuantity: normalized.buyQuantity ?? null,
          getQuantity: normalized.getQuantity ?? null,
        },
      });

      if (normalized.productIds.length > 0) {
        await tx.discountProduct.createMany({
          data: normalized.productIds.map((productId) => ({
            discountId: discount.id,
            productId,
          })),
        });
      }

      if (normalized.categoryIds.length > 0) {
        await tx.discountCategory.createMany({
          data: normalized.categoryIds.map((categoryId) => ({
            discountId: discount.id,
            categoryId,
          })),
        });
      }

      if (normalized.variantIds.length > 0) {
        await tx.discountVariant.createMany({
          data: normalized.variantIds.map((variantId) => ({
            discountId: discount.id,
            variantId,
          })),
        });
      }

      if (normalized.optionIds.length > 0) {
        await tx.discountOption.createMany({
          data: normalized.optionIds.map((productOptionId) => ({
            discountId: discount.id,
            productOptionId,
          })),
        });
      }

      if (normalized.optionValueTargets.length > 0) {
        await tx.discountOptionValue.createMany({
          data: normalized.optionValueTargets.map((target) => ({
            discountId: discount.id,
            productOptionId: target.productOptionId,
            value: target.value,
          })),
        });
      }

      if (normalized.couponCode) {
        await tx.coupon.create({
          data: {
            storeId,
            code: normalized.couponCode,
            discountId: discount.id,
            usageLimit: dto.couponUsageLimit ?? null,
          },
        });
      }

      return tx.discount.findUnique({
        where: { id: discount.id },
        include: this.discountInclude(),
      });
    });
  }

  async update(storeId: number, discountId: number, dto: CreateDiscountDto) {
    await this.ensureDiscountOwnership(storeId, discountId);
    const normalized = await this.normalizeDiscountInput(storeId, dto);

    return this.prisma.$transaction(async (tx) => {
      await tx.discount.update({
        where: { id: discountId },
        data: {
          name: dto.name,
          scope: normalized.scope,
          type: dto.type,
          value:
            dto.type === DiscountType.free_shipping ||
            dto.type === DiscountType.buy_x_get_y
              ? null
              : dto.value,
          minimumAmount: dto.minimumAmount ?? null,
          automatic: normalized.automatic,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
          buyQuantity: normalized.buyQuantity ?? null,
          getQuantity: normalized.getQuantity ?? null,
        },
      });

      await Promise.all([
        tx.discountProduct.deleteMany({ where: { discountId } }),
        tx.discountCategory.deleteMany({ where: { discountId } }),
        tx.discountVariant.deleteMany({ where: { discountId } }),
        tx.discountOption.deleteMany({ where: { discountId } }),
        tx.discountOptionValue.deleteMany({ where: { discountId } }),
      ]);

      if (normalized.productIds.length > 0) {
        await tx.discountProduct.createMany({
          data: normalized.productIds.map((productId) => ({
            discountId,
            productId,
          })),
        });
      }

      if (normalized.categoryIds.length > 0) {
        await tx.discountCategory.createMany({
          data: normalized.categoryIds.map((categoryId) => ({
            discountId,
            categoryId,
          })),
        });
      }

      if (normalized.variantIds.length > 0) {
        await tx.discountVariant.createMany({
          data: normalized.variantIds.map((variantId) => ({
            discountId,
            variantId,
          })),
        });
      }

      if (normalized.optionIds.length > 0) {
        await tx.discountOption.createMany({
          data: normalized.optionIds.map((productOptionId) => ({
            discountId,
            productOptionId,
          })),
        });
      }

      if (normalized.optionValueTargets.length > 0) {
        await tx.discountOptionValue.createMany({
          data: normalized.optionValueTargets.map((target) => ({
            discountId,
            productOptionId: target.productOptionId,
            value: target.value,
          })),
        });
      }

      const existingCoupon = await tx.coupon.findFirst({
        where: {
          discountId,
        },
      });

      if (normalized.couponCode) {
        if (existingCoupon) {
          await tx.coupon.update({
            where: { id: existingCoupon.id },
            data: {
              storeId,
              code: normalized.couponCode,
              usageLimit: dto.couponUsageLimit ?? null,
            },
          });
        } else {
          await tx.coupon.create({
            data: {
              storeId,
              code: normalized.couponCode,
              discountId,
              usageLimit: dto.couponUsageLimit ?? null,
            },
          });
        }
      } else if (existingCoupon) {
        await tx.coupon.delete({
          where: { id: existingCoupon.id },
        });
      }

      return tx.discount.findUnique({
        where: { id: discountId },
        include: this.discountInclude(),
      });
    });
  }

  async cancel(storeId: number, discountId: number) {
    await this.ensureDiscountOwnership(storeId, discountId);

    return this.prisma.discount.update({
      where: {
        id: discountId,
      },
      data: {
        endsAt: new Date(),
      },
      include: this.discountInclude(),
    });
  }

  async findAll(storeId: number) {
    return this.prisma.discount.findMany({
      where: {
        storeId,
      },
      include: this.discountInclude(),
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async applyCoupon(storeId: number, code: string, subtotal: number) {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        storeId,
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

    if (discount.scope !== DiscountScope.order) {
      throw new BadRequestException('Coupon invalid for this discount scope');
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

    const discountAmount = this.calculateDiscountAmount(discount, subtotal);

    return {
      discountId: discount.id,
      couponId: coupon.id,
      code: coupon.code,
      amount: discountAmount,
      freeShipping: discount.type === 'free_shipping',
    };
  }

  async previewDiscount(storeId: number, dto: PreviewDiscountDto) {
    const subtotal = roundCurrency(dto.subtotal ?? 0);
    const normalizedCode = dto.code?.trim().toUpperCase();
    const normalizedPaymentMethod = dto.paymentMethod?.trim().toLowerCase() ?? '';

    let couponDiscount:
      | {
          couponId: number;
          discountId: number;
          code: string;
          amount: number;
          freeShipping: boolean;
        }
      | null = null;

    if (normalizedCode) {
      couponDiscount = await this.applyCoupon(storeId, normalizedCode, subtotal);
    }

    const automaticDiscount = await this.discountEngine.calculateAutomaticDiscount({
      storeId,
      subtotal,
    });

    const baseDiscount = this.resolvePreferredDiscount(
      couponDiscount,
      automaticDiscount,
    );
    const bankTransferDiscount = await this.resolveBankTransferDiscount(
      storeId,
      subtotal,
      normalizedPaymentMethod,
    );

    if (!baseDiscount && !bankTransferDiscount) {
      return null;
    }

    const baseAmount = roundCurrency(baseDiscount?.amount ?? 0);
    const paymentMethodDiscountAmount = roundCurrency(
      bankTransferDiscount?.amount ?? 0,
    );

    return {
      source:
        baseDiscount?.source ??
        (bankTransferDiscount ? 'payment_method' : 'automatic'),
      discountId: baseDiscount?.discountId ?? null,
      couponId: baseDiscount?.couponId ?? undefined,
      code: baseDiscount?.code ?? null,
      amount: roundCurrency(baseAmount + paymentMethodDiscountAmount),
      baseAmount,
      paymentMethodDiscountAmount,
      paymentMethodDiscountPercentage:
        bankTransferDiscount?.percentage ?? 0,
      freeShipping: Boolean(baseDiscount?.freeShipping),
    };
  }

  private resolvePreferredDiscount(
    couponDiscount:
      | {
          couponId: number;
          discountId: number;
          code: string;
          amount: number;
          freeShipping: boolean;
        }
      | null,
    automaticDiscount:
      | {
          discountId: number;
          discountAmount: number;
          freeShipping: boolean;
        }
      | null,
  ) {
    if (couponDiscount && automaticDiscount) {
      if (couponDiscount.amount >= automaticDiscount.discountAmount) {
        return {
          source: 'coupon' as const,
          discountId: couponDiscount.discountId,
          couponId: couponDiscount.couponId,
          code: couponDiscount.code,
          amount: couponDiscount.amount,
          freeShipping: couponDiscount.freeShipping,
        };
      }

      return {
        source: 'automatic' as const,
        discountId: automaticDiscount.discountId,
        code: null,
        amount: automaticDiscount.discountAmount,
        freeShipping: automaticDiscount.freeShipping,
      };
    }

    if (couponDiscount) {
      return {
        source: 'coupon' as const,
        discountId: couponDiscount.discountId,
        couponId: couponDiscount.couponId,
        code: couponDiscount.code,
        amount: couponDiscount.amount,
        freeShipping: couponDiscount.freeShipping,
      };
    }

    if (automaticDiscount) {
      return {
        source: 'automatic' as const,
        discountId: automaticDiscount.discountId,
        code: null,
        amount: automaticDiscount.discountAmount,
        freeShipping: automaticDiscount.freeShipping,
      };
    }

    return null;
  }

  private async resolveBankTransferDiscount(
    storeId: number,
    subtotal: number,
    paymentMethod: string,
  ) {
    if (paymentMethod !== 'bank_transfer' || subtotal <= 0) {
      return null;
    }

    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        domain: true,
        storefrontConfig: true,
        bankTransferDiscountPercentage: true,
      },
    });

    const percentage = Math.max(
      0,
      Math.min(Number(store?.bankTransferDiscountPercentage ?? 0), 100),
    );

    if (percentage <= 0) {
      return null;
    }

    const pricingPolicy = resolveStorePricingPolicy(store);
    const roundedTransferTotal = resolveTransferPrice(
      subtotal,
      percentage,
      pricingPolicy,
    );
    const amount =
      roundedTransferTotal !== null
        ? roundCurrency(Math.min(Math.max(subtotal - roundedTransferTotal, 0), subtotal))
        : roundCurrency(subtotal * (percentage / 100));

    return {
      percentage,
      amount,
    };
  }

  private calculateDiscountAmount(discount: Discount, subtotal: number) {
    const value = discount.value ?? 0;
    let discountAmount = 0;

    if (discount.type === DiscountType.percentage) {
      discountAmount = subtotal * (value / 100);
    }

    if (discount.type === DiscountType.fixed_amount) {
      discountAmount = value;
    }

    return roundCurrency(Math.min(discountAmount, subtotal));
  }

  private async ensureDiscountOwnership(storeId: number, discountId: number) {
    const discount = await this.prisma.discount.findFirst({
      where: {
        id: discountId,
        storeId,
      },
      select: {
        id: true,
      },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }
  }

  private async normalizeDiscountInput(storeId: number, dto: CreateDiscountDto) {
    const automatic = dto.automatic ?? false;
    const couponCode = dto.couponCode?.trim().toUpperCase();
    const scope = dto.scope ?? DiscountScope.order;
    const productIds = [...new Set(dto.productIds ?? [])];
    const categoryIds = [...new Set(dto.categoryIds ?? [])];
    const variantIds = [...new Set(dto.variantIds ?? [])];
    const optionIds = [...new Set(dto.optionIds ?? [])];
    const optionValueTargets = [
      ...new Map(
        (dto.optionValueTargets ?? [])
          .map((target) => ({
            productOptionId: Number(target.productOptionId),
            value: target.value.trim(),
          }))
          .filter((target) => target.productOptionId > 0 && target.value.length > 0)
          .map((target) => [
            `${target.productOptionId}:${target.value.toLowerCase()}`,
            target,
          ]),
      ).values(),
    ];

    if (!automatic && !couponCode) {
      throw new BadRequestException('Manual discounts require a coupon code');
    }

    if (automatic && couponCode) {
      throw new BadRequestException(
        'Automatic discounts cannot define a coupon code',
      );
    }

    if (dto.startsAt && dto.endsAt && new Date(dto.startsAt) > new Date(dto.endsAt)) {
      throw new BadRequestException('Discount start date must be before end date');
    }

    if (
      scope === DiscountScope.order &&
      (
        productIds.length > 0 ||
        categoryIds.length > 0 ||
        variantIds.length > 0 ||
        optionIds.length > 0 ||
        optionValueTargets.length > 0
      )
    ) {
      throw new BadRequestException(
        'Order-scoped discounts cannot target products, categories, variants, options or option values',
      );
    }

    if (scope === DiscountScope.product && productIds.length === 0) {
      throw new BadRequestException(
        'Product-scoped discounts require at least one product target',
      );
    }

    if (scope === DiscountScope.category && categoryIds.length === 0) {
      throw new BadRequestException(
        'Category-scoped discounts require at least one category target',
      );
    }

    if (scope === DiscountScope.variant && variantIds.length === 0) {
      throw new BadRequestException(
        'Variant-scoped discounts require at least one variant target',
      );
    }

    if (scope === DiscountScope.option && optionIds.length === 0) {
      throw new BadRequestException(
        'Option-scoped discounts require at least one option target',
      );
    }

    if (scope === DiscountScope.option_value && optionValueTargets.length === 0) {
      throw new BadRequestException(
        'Option value-scoped discounts require at least one option value target',
      );
    }

    if (scope !== DiscountScope.order && couponCode) {
      throw new BadRequestException(
        'Coupons are only supported for order-scoped discounts',
      );
    }

    if (scope !== DiscountScope.product && productIds.length > 0) {
      throw new BadRequestException(
        'Product targets are only supported for product-scoped discounts',
      );
    }

    if (scope !== DiscountScope.category && categoryIds.length > 0) {
      throw new BadRequestException(
        'Category targets are only supported for category-scoped discounts',
      );
    }

    if (scope !== DiscountScope.variant && variantIds.length > 0) {
      throw new BadRequestException(
        'Variant targets are only supported for variant-scoped discounts',
      );
    }

    if (scope !== DiscountScope.option && optionIds.length > 0) {
      throw new BadRequestException(
        'Option targets are only supported for option-scoped discounts',
      );
    }

    if (scope !== DiscountScope.option_value && optionValueTargets.length > 0) {
      throw new BadRequestException(
        'Option value targets are only supported for option value-scoped discounts',
      );
    }

    if (scope !== DiscountScope.order && dto.type === DiscountType.free_shipping) {
      throw new BadRequestException('Free shipping discounts must be order-scoped');
    }

    if (dto.type === DiscountType.buy_x_get_y) {
      if (scope !== DiscountScope.category) {
        throw new BadRequestException(
          'buy_x_get_y discounts must be category-scoped',
        );
      }

      if (!dto.buyQuantity || dto.buyQuantity < 2) {
        throw new BadRequestException(
          'buy_x_get_y discounts require buyQuantity >= 2',
        );
      }

      if (!dto.getQuantity || dto.getQuantity < 1) {
        throw new BadRequestException(
          'buy_x_get_y discounts require getQuantity >= 1',
        );
      }

      if (dto.getQuantity >= dto.buyQuantity) {
        throw new BadRequestException(
          'getQuantity must be less than buyQuantity',
        );
      }
    }

    if (productIds.length > 0) {
      const productCount = await this.prisma.product.count({
        where: {
          storeId,
          id: { in: productIds },
        },
      });

      if (productCount !== productIds.length) {
        throw new BadRequestException('One or more product targets are invalid');
      }
    }

    if (categoryIds.length > 0) {
      const categoryCount = await this.prisma.category.count({
        where: {
          storeId,
          id: { in: categoryIds },
        },
      });

      if (categoryCount !== categoryIds.length) {
        throw new BadRequestException('One or more category targets are invalid');
      }
    }

    if (variantIds.length > 0) {
      const variantCount = await this.prisma.productVariant.count({
        where: {
          id: { in: variantIds },
          deletedAt: null,
          product: {
            storeId,
          },
        },
      });

      if (variantCount !== variantIds.length) {
        throw new BadRequestException('One or more variant targets are invalid');
      }
    }

    if (optionIds.length > 0) {
      const optionCount = await this.prisma.productOption.count({
        where: {
          storeId,
          id: { in: optionIds },
        },
      });

      if (optionCount !== optionIds.length) {
        throw new BadRequestException('One or more option targets are invalid');
      }
    }

    if (optionValueTargets.length > 0) {
      const uniqueOptionIds = [
        ...new Set(optionValueTargets.map((target) => target.productOptionId)),
      ];
      const optionCount = await this.prisma.productOption.count({
        where: {
          storeId,
          id: { in: uniqueOptionIds },
        },
      });

      if (optionCount !== uniqueOptionIds.length) {
        throw new BadRequestException('One or more option value targets are invalid');
      }
    }

    return {
      automatic,
      couponCode,
      scope,
      productIds,
      categoryIds,
      variantIds,
      optionIds,
      optionValueTargets,
      buyQuantity: dto.buyQuantity ?? null,
      getQuantity: dto.getQuantity ?? null,
    };
  }

  private discountInclude() {
    return {
      coupons: true,
      productTargets: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      },
      categoryTargets: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      variantTargets: {
        include: {
          productVariant: {
            select: {
              id: true,
              sku: true,
              Size: true,
              Color: true,
              product: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      },
      optionTargets: {
        include: {
          productOption: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      optionValueTargets: {
        include: {
          productOption: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    };
  }
}
