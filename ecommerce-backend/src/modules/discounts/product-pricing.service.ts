import { Injectable } from '@nestjs/common';
import { DiscountScope, DiscountType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { roundCurrency } from '../../common/currency';

type ProductWithPricingInputs = {
  id: number;
  categories?: Array<{ category: { id: number } }>;
  optionValues?: Array<{ productOptionId: number; value: string }>;
  variants?: Array<{
    id: number;
    price: Prisma.Decimal | number | string;
  }>;
};

type ProductVariantInput = NonNullable<ProductWithPricingInputs['variants']>[number];

type ProductPricingDetails = {
  basePrice: number;
  finalPrice: number;
  discountAmount: number;
  discountPercentage: number;
  hasActivePromotion: boolean;
  promotionLabel: string | null;
  pricingDiscountId: number | null;
  promotionType: DiscountType | null;
  promotionValue: number | null;
};

type ScopedDiscount = Prisma.DiscountGetPayload<{
  include: {
    productTargets: true;
    categoryTargets: true;
    variantTargets: true;
    optionTargets: true;
    optionValueTargets: true;
  };
}>;

@Injectable()
export class ProductPricingService {
  constructor(private prisma: PrismaService) {}

  async attachPricingToProducts<T extends ProductWithPricingInputs>(
    storeId: number,
    products: T[],
  ): Promise<
    Array<
      T & {
        pricing: ProductPricingDetails;
        variants?: Array<
          ProductVariantInput & {
            pricing: ProductPricingDetails;
          }
        >;
      }
    >
  > {
    if (products.length === 0) {
      return [];
    }

    const scopedDiscounts = await this.getActiveScopedDiscounts(storeId, products);

    return products.map((product) => {
      const variantsWithPricing = (product.variants ?? []).map((variant) => ({
        ...variant,
        pricing: this.resolvePricingForVariant(product, variant, scopedDiscounts),
      }));

      return {
        ...product,
        variants: variantsWithPricing,
        pricing: this.resolvePricingForProduct(
          {
            ...product,
            variants: variantsWithPricing,
          },
          scopedDiscounts,
        ),
      };
    });
  }

  async resolveCartItemDiscounts(
    storeId: number,
    items: Array<{
      quantity: number;
      variant: {
        id: number;
        price: Prisma.Decimal | number | string;
        product: {
          id: number;
          categories?: Array<{ category: { id: number } }>;
          optionValues?: Array<{ productOptionId: number; value: string }>;
        };
      };
    }>,
  ) {
    if (items.length === 0) {
      return {
        baseSubtotal: 0,
        itemScopedDiscountAmount: 0,
        discountedSubtotal: 0,
      };
    }

    const products = items.map((item) => ({
      id: item.variant.product.id,
      categories: item.variant.product.categories ?? [],
      optionValues: item.variant.product.optionValues ?? [],
      variants: [{ id: item.variant.id, price: item.variant.price }],
    }));

    const scopedDiscounts = await this.getActiveScopedDiscounts(storeId, products);

    let baseSubtotal = 0;
    let itemScopedDiscountAmount = 0;

    for (const item of items) {
      const unitPrice = Number(item.variant.price ?? 0);
      const pricing = this.resolvePricingForVariant(
        {
          id: item.variant.product.id,
          categories: item.variant.product.categories ?? [],
          optionValues: item.variant.product.optionValues ?? [],
        },
        { id: item.variant.id, price: item.variant.price },
        scopedDiscounts,
      );

      baseSubtotal = roundCurrency(baseSubtotal + unitPrice * item.quantity);
      itemScopedDiscountAmount = roundCurrency(
        itemScopedDiscountAmount + pricing.discountAmount * item.quantity,
      );
    }

    return {
      baseSubtotal,
      itemScopedDiscountAmount,
      discountedSubtotal: roundCurrency(
        Math.max(baseSubtotal - itemScopedDiscountAmount, 0),
      ),
    };
  }

  private async getActiveScopedDiscounts(
    storeId: number,
    products: ProductWithPricingInputs[],
  ) {
    const now = new Date();
    const productIds = products.map((product) => product.id);
    const variantIds = products.flatMap((product) =>
      (product.variants ?? []).map((variant) => variant.id),
    );
    const optionIds = [
      ...new Set(
        products.flatMap((product) =>
          (product.optionValues ?? []).map((value) => value.productOptionId),
        ),
      ),
    ];
    const scopedMatchers: Prisma.DiscountWhereInput[] = [
      {
        productTargets: {
          some: {
            productId: { in: productIds },
          },
        },
      },
      {
        categoryTargets: {
          some: {},
        },
      },
    ];

    if (variantIds.length > 0) {
      scopedMatchers.push({
        variantTargets: {
          some: {
            variantId: { in: variantIds },
          },
        },
      });
    }

    if (optionIds.length > 0) {
      scopedMatchers.push({
        optionTargets: {
          some: {
            productOptionId: { in: optionIds },
          },
        },
      });
      scopedMatchers.push({
        optionValueTargets: {
          some: {
            productOptionId: { in: optionIds },
          },
        },
      });
    }

    return this.prisma.discount.findMany({
      where: {
        storeId,
        automatic: true,
        scope: {
          in: [
            DiscountScope.product,
            DiscountScope.category,
            DiscountScope.variant,
            DiscountScope.option,
            DiscountScope.option_value,
          ],
        },
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [
          {
            OR: [{ endsAt: null }, { endsAt: { gte: now } }],
          },
          {
            OR: scopedMatchers,
          },
        ],
      },
      include: {
        productTargets: true,
        categoryTargets: true,
        variantTargets: true,
        optionTargets: true,
        optionValueTargets: true,
      },
    });
  }

  private resolvePricingForProduct(
    product: ProductWithPricingInputs,
    scopedDiscounts: ScopedDiscount[],
  ): ProductPricingDetails {
    const variants = product.variants ?? [];

    if (variants.length === 0) {
      return this.emptyPricing();
    }

    const variantPricings = variants.map((variant) =>
      this.resolvePricingForVariant(product, variant, scopedDiscounts),
    );

    const bestVariantPricing = variantPricings.reduce((best, current) => {
      if (current.finalPrice < best.finalPrice) {
        return current;
      }

      if (
        current.finalPrice === best.finalPrice &&
        current.basePrice < best.basePrice
      ) {
        return current;
      }

      return best;
    });

    return bestVariantPricing;
  }

  private resolvePricingForVariant(
    product: Omit<ProductWithPricingInputs, 'variants'>,
    variant: ProductVariantInput,
    scopedDiscounts: ScopedDiscount[],
  ): ProductPricingDetails {
    const basePrice = roundCurrency(variant.price ?? 0);

    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      return this.emptyPricing();
    }

    const categoryIds = new Set(
      (product.categories ?? []).map((entry) => entry.category.id),
    );
    const optionValueKeys = new Set(
      (product.optionValues ?? []).map((entry) =>
        this.optionValueKey(entry.productOptionId, entry.value),
      ),
    );

    let bestDiscountAmount = 0;
    let bestDiscountId: number | null = null;
    let bestLabel: string | null = null;
    let bestType: DiscountType | null = null;
    let bestValue: number | null = null;

    for (const discount of scopedDiscounts) {
      const appliesToProduct =
        discount.scope === DiscountScope.product &&
        discount.productTargets.some((target) => target.productId === product.id);
      const appliesToCategory =
        discount.scope === DiscountScope.category &&
        discount.categoryTargets.some((target) => categoryIds.has(target.categoryId));
      const appliesToVariant =
        discount.scope === DiscountScope.variant &&
        discount.variantTargets.some((target) => target.variantId === variant.id);
      const appliesToOption =
        discount.scope === DiscountScope.option &&
        discount.optionTargets.some((target) =>
          (product.optionValues ?? []).some(
            (entry) => entry.productOptionId === target.productOptionId,
          ),
        );
      const appliesToOptionValue =
        discount.scope === DiscountScope.option_value &&
        discount.optionValueTargets.some((target) =>
          optionValueKeys.has(
            this.optionValueKey(target.productOptionId, target.value),
          ),
        );

      if (
        !appliesToProduct &&
        !appliesToCategory &&
        !appliesToVariant &&
        !appliesToOption &&
        !appliesToOptionValue
      ) {
        continue;
      }

      const discountAmount = this.calculateDiscountAmount(
        discount.type,
        discount.value ?? 0,
        basePrice,
      );

      if (discountAmount > bestDiscountAmount) {
        bestDiscountAmount = discountAmount;
        bestDiscountId = discount.id;
        bestLabel = discount.name;
        bestType = discount.type;
        bestValue = discount.value ?? null;
      }
    }

    const roundedDiscountAmount = roundCurrency(bestDiscountAmount);
    const finalPrice = roundCurrency(Math.max(basePrice - roundedDiscountAmount, 0));
    const discountPercentage =
      basePrice > 0 ? Math.round((roundedDiscountAmount / basePrice) * 100) : 0;

    return {
      basePrice,
      finalPrice,
      discountAmount: roundedDiscountAmount,
      discountPercentage,
      hasActivePromotion: bestDiscountAmount > 0,
      promotionLabel: bestLabel,
      pricingDiscountId: bestDiscountId,
      promotionType: bestType,
      promotionValue: bestValue,
    };
  }

  private emptyPricing(): ProductPricingDetails {
    return {
      basePrice: 0,
      finalPrice: 0,
      discountAmount: 0,
      discountPercentage: 0,
      hasActivePromotion: false,
      promotionLabel: null,
      pricingDiscountId: null,
      promotionType: null,
      promotionValue: null,
    };
  }

  private optionValueKey(productOptionId: number, value: string) {
    return `${productOptionId}:${value.trim().toLowerCase()}`;
  }

  private calculateDiscountAmount(
    type: DiscountType,
    value: number,
    basePrice: number,
  ) {
    if (basePrice <= 0) {
      return 0;
    }

    if (type === DiscountType.percentage) {
      return roundCurrency(Math.min(basePrice * (value / 100), basePrice));
    }

    if (type === DiscountType.fixed_amount) {
      return roundCurrency(Math.min(value, basePrice));
    }

    return 0;
  }
}
