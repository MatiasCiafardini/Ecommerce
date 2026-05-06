import { cache } from "react";
import { apiFetch } from "./api-client";

type StorePaymentConfig = {
  bankTransfer?: {
    alias?: string | null;
    discountPercentage?: number | null;
    enabled?: boolean | null;
  } | null;
};

const fetchStorePaymentConfig = cache(async (): Promise<StorePaymentConfig | null> => {
  try {
    return await apiFetch<StorePaymentConfig>("/store/payment-config");
  } catch {
    return null;
  }
});

export async function getBankTransferDiscountPercentage() {
  const config = await fetchStorePaymentConfig();
  const enabled = config?.bankTransfer?.enabled !== false;
  const percentage = Number(config?.bankTransfer?.discountPercentage ?? 0);

  if (!enabled || !Number.isFinite(percentage) || percentage <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(percentage, 100));
}
