import { apiFetch } from "./api-client";
import { StoreProductOption } from "@/types/store";

export async function getStoreProductOptions(): Promise<StoreProductOption[]> {
  const options = await apiFetch<StoreProductOption[]>("/store/options");

  if (!Array.isArray(options)) {
    return [];
  }

  return options;
}

export async function getProductOptions(slug: string) {
  const options = await apiFetch<StoreProductOption[]>(
    `/store/products/${slug}/options`,
  );

  if (!Array.isArray(options)) {
    return [];
  }

  return options;
}
