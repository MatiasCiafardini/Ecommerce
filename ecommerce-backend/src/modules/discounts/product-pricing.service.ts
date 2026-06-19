import { Injectable } from '@nestjs/common';
import { DiscountScope, DiscountType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { roundCurrency } from '../../common/currency';
import {
  resolveLabelNormalPrice,
  resolveStorePricingPolicy,
} from '../../common/price-input-mode';

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
  hasBuyXGetYPromotion: boolean;
  buyXGetYLabel: string | null;
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

type CartItemDiscountBreakdown = {
  variantId: number;
  quantity: number;
  unitPrice: number;
  itemScopedDiscountPerUnit: number;
  buyXGetYDiscountTotal: number;
};

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
        itemBreakdown: [] as CartItemDiscountBreakdown[],
      };
    }

    const pricingPolicy = resolveStorePricingPolicy({ id: storeId });
    const pricedItems = items.map((item) => ({
      ...item,
      variant: {
        ...item.variant,
        price: resolveLabelNormalPrice(
          roundCurrency(Number(item.variant.price ?? 0)),
          pricingPolicy,
        ),
      },
    }));

    const products = pricedItems.map((item) => ({
      id: item.variant.product.id,
      categories: item.variant.product.categories ?? [],
      optionValues: item.variant.product.optionValues ?? [],
      variants: [{ id: item.variant.id, price: item.variant.price }],
    }));

    const scopedDiscounts = await this.getActiveScopedDiscounts(storeId, products);

    // Separar descuentos normales de buy_x_get_y para procesarlos correctamente
    const regularDiscounts = scopedDiscounts.filter(
      (d) => d.type !== DiscountType.buy_x_get_y,
    );
    const buyXGetYDiscounts = scopedDiscounts.filter(
      (d) => d.type === DiscountType.buy_x_get_y,
    );

    // Calcular descuentos regulares por item (percentage/fixed_amount)
    const regularDiscountByVariant = new Map<number, number>();
    for (const item of pricedItems) {
      const pricing = this.resolvePricingForVariant(
        {
          id: item.variant.product.id,
          categories: item.variant.product.categories ?? [],
          optionValues: item.variant.product.optionValues ?? [],
        },
        { id: item.variant.id, price: item.variant.price },
        regularDiscounts,
      );
      regularDiscountByVariant.set(item.variant.id, pricing.discountAmount);
    }

    // Calcular descuentos buy_x_get_y agrupados por categoría
    const buyXGetYDiscountByVariant = this.calculateBuyXGetYDiscounts(
      pricedItems,
      buyXGetYDiscounts,
    );

    let baseSubtotal = 0;
    let itemScopedDiscountAmount = 0;
    const itemBreakdown: CartItemDiscountBreakdown[] = [];

    for (const item of pricedItems) {
      const unitPrice = roundCurrency(Number(item.variant.price ?? 0));
      const regularDiscountPerUnit = regularDiscountByVariant.get(item.variant.id) ?? 0;
      const buyXGetYDiscountForItem = buyXGetYDiscountByVariant.get(item.variant.id) ?? 0;

      // Aplicar el mayor entre descuento regular (total de la línea) y buy_x_get_y
      const regularLineDiscount = roundCurrency(regularDiscountPerUnit * item.quantity);
      const effectiveLineDiscount = roundCurrency(
        Math.max(regularLineDiscount, buyXGetYDiscountForItem),
      );

      baseSubtotal = roundCurrency(baseSubtotal + unitPrice * item.quantity);
      itemScopedDiscountAmount = roundCurrency(
        itemScopedDiscountAmount + effectiveLineDiscount,
      );

      itemBreakdown.push({
        variantId: item.variant.id,
        quantity: item.quantity,
        unitPrice,
        itemScopedDiscountPerUnit: effectiveLineDiscount > 0
          ? roundCurrency(effectiveLineDiscount / item.quantity)
          : 0,
        buyXGetYDiscountTotal: buyXGetYDiscountForItem,
      });
    }

    return {
      baseSubtotal,
      itemScopedDiscountAmount,
      discountedSubtotal: roundCurrency(
        Math.max(baseSubtotal - itemScopedDiscountAmount, 0),
      ),
      itemBreakdown,
    };
  }

  /**
   * Calcula la bonificación buy_x_get_y por categoría.
   *
   * Algoritmo:
   * 1. Por cada descuento buy_x_get_y, filtra los items del carrito cuyos productos
   *    pertenezcan a alguna de las categorías target del descuento.
   * 2. Expande los items en unidades individuales (quantity=3 → 3 entradas).
   * 3. Ordena las unidades por precio ascendente.
   * 4. Por cada grupo de `buyQuantity` unidades, bonifica las `getQuantity` más baratas.
   * 5. Distribuye el descuento total de vuelta a los CartItems originales
   *    priorizando los de menor precio.
   *
   * La distribución al item original se hace para preservar el contrato de
   * `itemBreakdown` sin romper la firma pública de `resolveCartItemDiscounts`.
   */
  private calculateBuyXGetYDiscounts(
    items: Array<{
      quantity: number;
      variant: {
        id: number;
        price: Prisma.Decimal | number | string;
        product: {
          id: number;
          categories?: Array<{ category: { id: number } }>;
        };
      };
    }>,
    buyXGetYDiscounts: ScopedDiscount[],
  ): Map<number, number> {
    // variantId → totalDiscountAmount
    const result = new Map<number, number>();

    for (const discount of buyXGetYDiscounts) {
      const buyQty = discount.buyQuantity ?? 3;
      const getQty = discount.getQuantity ?? 1;
      const targetCategoryIds = new Set(
        discount.categoryTargets.map((t) => t.categoryId),
      );

      // Filtrar items elegibles (productos de la categoría)
      const eligibleItems = items.filter((item) =>
        (item.variant.product.categories ?? []).some((c) =>
          targetCategoryIds.has(c.category.id),
        ),
      );

      if (eligibleItems.length === 0) continue;

      // Expandir a unidades individuales: { variantId, price }
      type Unit = { variantId: number; price: number };
      const units: Unit[] = [];
      for (const item of eligibleItems) {
        const price = roundCurrency(Number(item.variant.price ?? 0));
        for (let i = 0; i < item.quantity; i++) {
          units.push({ variantId: item.variant.id, price });
        }
      }

      // Ordenar ascendente (la más barata primero)
      units.sort((a, b) => a.price - b.price);

      const totalUnits = units.length;
      const groupCount = Math.floor(totalUnits / buyQty);

      if (groupCount === 0) continue;

      // Por cada grupo de `buyQty`, las primeras `getQty` unidades (más baratas) son bonificadas
      // Tras ordenar ASC y tomar grupos de `buyQty`, la unidad bonificada es la [0..getQty-1]
      // de cada grupo (que son las más baratas del grupo porque el array está ordenado ASC
      // y tomamos grupos consecutivos)
      const bonusDiscountByVariant = new Map<number, number>();

      for (let g = 0; g < groupCount; g++) {
        const groupStart = g * buyQty;
        // Las primeras `getQty` del grupo son las más baratas → se bonifican
        for (let b = 0; b < getQty; b++) {
          const unit = units[groupStart + b];
          bonusDiscountByVariant.set(
            unit.variantId,
            roundCurrency((bonusDiscountByVariant.get(unit.variantId) ?? 0) + unit.price),
          );
        }
      }

      // Acumular en el resultado final (puede haber múltiples descuentos buy_x_get_y activos)
      for (const [variantId, amount] of bonusDiscountByVariant) {
        result.set(variantId, roundCurrency((result.get(variantId) ?? 0) + amount));
      }
    }

    return result;
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

    // Detectar si hay una promo buy_x_get_y activa para alguna categoría del producto
    // (no afecta el precio de lista, solo sirve para mostrar el badge en catálogo)
    let hasBuyXGetYPromotion = false;
    let buyXGetYLabel: string | null = null;

    for (const discount of scopedDiscounts) {
      if (discount.type !== DiscountType.buy_x_get_y) continue;
      if (discount.scope !== DiscountScope.category) continue;
      if (discount.categoryTargets.some((t) => categoryIds.has(t.categoryId))) {
        hasBuyXGetYPromotion = true;
        buyXGetYLabel = discount.name;
        break;
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
      hasBuyXGetYPromotion,
      buyXGetYLabel,
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
      hasBuyXGetYPromotion: false,
      buyXGetYLabel: null,
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
