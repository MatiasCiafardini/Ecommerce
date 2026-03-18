import { apiFetch } from "./api-client";

export async function getStoreProductOptions() {
  const options = await apiFetch("/store/options");

  if (!Array.isArray(options)) {
    return [];
  }

  return options;
}

export async function getProductOptions(slug: string) {
  const options = await apiFetch(`/store/products/${slug}/options`);

  if (!Array.isArray(options)) {
    return [];
  }

  return options;
}
