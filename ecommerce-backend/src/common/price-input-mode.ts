import { Prisma } from '@prisma/client';

type StorePricingIdentity = {
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

function isComoVosYYoStore(store: StorePricingIdentity) {
  const theme = normalizeIdentityValue(readConfigTheme(store.storefrontConfig));
  const name = normalizeIdentityValue(store.name);
  const domain = normalizeIdentityValue(store.domain);

  return (
    theme === 'comovosyyo' ||
    name.includes('como vos y yo') ||
    name.includes('comovosyyo') ||
    domain.includes('comovosyyo')
  );
}

export function resolveCashPriceInputSettings(
  store: StorePricingIdentity | null | undefined,
): CashPriceInputSettings {
  if (!store || !isComoVosYYoStore(store)) {
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

export function convertCashInputToBasePrice(
  price: number,
  settings: CashPriceInputSettings,
) {
  if (!settings.enabled || settings.multiplier <= 0) {
    return price;
  }

  return Number((price / settings.multiplier).toFixed(2));
}
