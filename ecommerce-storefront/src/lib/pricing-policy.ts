export type StorePricingPolicy = {
  labelPriceRounding: boolean;
  transferPriceRounding: boolean;
  manualSaleDiscountRounding: boolean;
};

const ROUNDED_CASH_PRICING_STORE_IDS = new Set([7]);

const DEFAULT_POLICY: StorePricingPolicy = {
  labelPriceRounding: false,
  transferPriceRounding: false,
  manualSaleDiscountRounding: false,
};

export function resolveStorePricingPolicy(input: {
  storeId?: number | null;
}): StorePricingPolicy {
  if (!ROUNDED_CASH_PRICING_STORE_IDS.has(Number(input.storeId))) {
    return DEFAULT_POLICY;
  }

  return {
    labelPriceRounding: true,
    transferPriceRounding: true,
    manualSaleDiscountRounding: true,
  };
}

export function roundToNearestHundred(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value / 100) * 100;
}

export function resolveLabelNormalPrice(
  price: string | number | null | undefined,
  policy: Pick<StorePricingPolicy, "labelPriceRounding">,
) {
  const parsed = Number(price ?? 0);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return policy.labelPriceRounding ? roundToNearestHundred(parsed) : parsed;
}

export function resolveManualSaleUnitPrice(
  price: string | number | null | undefined,
  policy: Pick<StorePricingPolicy, "labelPriceRounding">,
) {
  return resolveLabelNormalPrice(price, policy);
}

export function resolveTransferPrice(
  price: string | number | null | undefined,
  discountPercentage: number,
  policy: Pick<StorePricingPolicy, "transferPriceRounding">,
) {
  const parsed = Number(price ?? 0);
  const safePercentage = Number.isFinite(discountPercentage)
    ? Math.min(Math.max(discountPercentage, 0), 100)
    : 0;

  if (!Number.isFinite(parsed) || parsed <= 0) return 0;

  const discountedPrice = parsed * (1 - safePercentage / 100);
  return policy.transferPriceRounding ? roundToNearestHundred(discountedPrice) : discountedPrice;
}

export function calculateManualSaleDiscountAmount(
  lines: Array<{ price: string | number; quantity: number }>,
  subtotal: number,
  discountValue: number,
  policy: Pick<StorePricingPolicy, "manualSaleDiscountRounding">,
) {
  const safeSubtotal = Number.isFinite(subtotal) ? Math.max(subtotal, 0) : 0;
  const safePercentage = Number.isFinite(discountValue)
    ? Math.min(Math.max(discountValue, 0), 100)
    : 0;

  if (safeSubtotal <= 0 || safePercentage <= 0) return 0;

  if (!policy.manualSaleDiscountRounding) {
    return Number(Math.min(safeSubtotal * (safePercentage / 100), safeSubtotal).toFixed(2));
  }

  const labelTotal = lines.reduce((total, line) => {
    const unitPrice = Number(line.price || 0);
    const quantity = Number(line.quantity || 0);
    const roundedDiscountedUnitPrice = roundToNearestHundred(
      unitPrice * (1 - safePercentage / 100),
    );

    return total + roundedDiscountedUnitPrice * quantity;
  }, 0);

  return Number(Math.min(Math.max(safeSubtotal - labelTotal, 0), safeSubtotal).toFixed(2));
}
