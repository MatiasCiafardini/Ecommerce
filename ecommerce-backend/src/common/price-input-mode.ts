import { Prisma } from '@prisma/client';

type StorePricingIdentity = {
  id?: number | null;
  name?: string | null;
  domain?: string | null;
  storefrontConfig?: Prisma.JsonValue | null;
  bankTransferDiscountPercentage?: number | null;
};

export type CashPriceInputSettings = {
  enabled: boolean;
  discountPercentage: number;
  multiplier: number;
};

const DEFAULT_SETTINGS: CashPriceInputSettings = {
  enabled: false,
  discountPercentage: 0,
  multiplier: 1,
};
const CASH_PAYMENT_DISCOUNT_STORE_IDS = new Set([3, 7]);

export type StorePricingPolicy = {
  cashInput: CashPriceInputSettings;
  cashPaymentDiscount: CashPriceInputSettings;
  labelPriceRounding: boolean;
  transferPriceRounding: boolean;
  manualSaleDiscountRounding: boolean;
};

function normalizeIdentityValue(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function readConfigTheme(storefrontConfig?: Prisma.JsonValue | null) {
  if (
    !storefrontConfig ||
    typeof storefrontConfig !== 'object' ||
    Array.isArray(storefrontConfig)
  ) {
    return '';
  }

  const theme = (storefrontConfig as Record<string, unknown>).theme;
  return typeof theme === 'string' ? theme : '';
}

export function isComoVosYYoStore(store: StorePricingIdentity) {
  const theme = normalizeIdentityValue(readConfigTheme(store.storefrontConfig));
  const name = normalizeIdentityValue(store.name);
  const domain = normalizeIdentityValue(store.domain);

  return (
    store.id === 7 ||
    theme === 'comovosyyo' ||
    name.includes('como vos y yo') ||
    name.includes('comovosyyo') ||
    domain.includes('comovosyyo')
  );
}

export function isRoundedCashPricingStore(store: StorePricingIdentity) {
  return isComoVosYYoStore(store);
}

export function isCashPaymentDiscountStore(store: StorePricingIdentity) {
  const theme = normalizeIdentityValue(readConfigTheme(store.storefrontConfig));
  const name = normalizeIdentityValue(store.name);
  const domain = normalizeIdentityValue(store.domain);

  return (
    CASH_PAYMENT_DISCOUNT_STORE_IDS.has(Number(store.id)) ||
    isComoVosYYoStore(store) ||
    theme === 'trojani' ||
    name.includes('trojani') ||
    domain.includes('trojani')
  );
}

export function resolveCashPriceInputSettings(
  store: StorePricingIdentity | null | undefined,
): CashPriceInputSettings {
  if (!store || !isRoundedCashPricingStore(store)) {
    return DEFAULT_SETTINGS;
  }

  const discountPercentage = Math.max(
    0,
    Math.min(Number(store.bankTransferDiscountPercentage ?? 0) || 0, 100),
  );

  if (discountPercentage <= 0 || discountPercentage >= 100) {
    return DEFAULT_SETTINGS;
  }

  return {
    enabled: true,
    discountPercentage,
    multiplier: Number((1 - discountPercentage / 100).toFixed(6)),
  };
}

export function resolveCashPaymentDiscountSettings(
  store: StorePricingIdentity | null | undefined,
): CashPriceInputSettings {
  if (!store || !isCashPaymentDiscountStore(store)) {
    return DEFAULT_SETTINGS;
  }

  const discountPercentage = Math.max(
    0,
    Math.min(Number(store.bankTransferDiscountPercentage ?? 0) || 0, 100),
  );

  if (discountPercentage <= 0 || discountPercentage >= 100) {
    return DEFAULT_SETTINGS;
  }

  return {
    enabled: true,
    discountPercentage,
    multiplier: Number((1 - discountPercentage / 100).toFixed(6)),
  };
}

export function resolveStorePricingPolicy(
  store: StorePricingIdentity | null | undefined,
): StorePricingPolicy {
  const roundedCashPricing = Boolean(store && isRoundedCashPricingStore(store));

  return {
    cashInput: resolveCashPriceInputSettings(store),
    cashPaymentDiscount: resolveCashPaymentDiscountSettings(store),
    labelPriceRounding: roundedCashPricing,
    transferPriceRounding: roundedCashPricing,
    manualSaleDiscountRounding: roundedCashPricing,
  };
}

export function roundToNearestHundred(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.round(value / 100) * 100;
}

export function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function resolveLabelNormalPrice(
  price: number,
  policy: Pick<StorePricingPolicy, 'labelPriceRounding'>,
) {
  if (!Number.isFinite(price) || price <= 0) return 0;
  return policy.labelPriceRounding ? roundToNearestHundred(price) : price;
}

export function resolveTransferPrice(
  price: number,
  discountPercentage: number,
  policy: Pick<StorePricingPolicy, 'transferPriceRounding'>,
) {
  if (!Number.isFinite(price) || price <= 0 || discountPercentage <= 0) return null;

  const discountedPrice = price * (1 - discountPercentage / 100);
  return policy.transferPriceRounding
    ? roundToNearestHundred(discountedPrice)
    : roundCurrency(discountedPrice);
}

export function calculateManualSaleDiscountAmount(
  subtotal: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number,
  items: Array<{ price: number; quantity: number }> = [],
  policy: Pick<StorePricingPolicy, 'manualSaleDiscountRounding'>,
) {
  if (subtotal <= 0 || discountValue <= 0) {
    return 0;
  }

  if (discountType === 'percentage') {
    const normalizedPercentage = Math.min(discountValue, 100);
    if (policy.manualSaleDiscountRounding && items.length > 0) {
      const labelTotal = items.reduce((total, item) => {
        const unitPrice = Number(item.price);
        const quantity = Number(item.quantity);
        const discountedUnitPrice = roundToNearestHundred(
          unitPrice * (1 - normalizedPercentage / 100),
        );

        return total + discountedUnitPrice * quantity;
      }, 0);

      return roundCurrency(Math.min(Math.max(subtotal - labelTotal, 0), subtotal));
    }

    return roundCurrency(
      Math.min(subtotal * (normalizedPercentage / 100), subtotal),
    );
  }

  return roundCurrency(Math.min(discountValue, subtotal));
}

export function convertCashInputToBasePrice(
  price: number,
  settings: CashPriceInputSettings,
) {
  if (!settings.enabled || settings.multiplier <= 0) {
    return price;
  }

  return Number((price / settings.multiplier).toFixed(2));
}
