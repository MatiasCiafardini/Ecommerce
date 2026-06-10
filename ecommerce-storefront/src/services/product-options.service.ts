import { PUBLIC_REVALIDATE, apiFetch } from "./api-client";
import { StoreProductOption } from "@/types/store";

export async function getStoreProductOptions(): Promise<StoreProductOption[]> {
  let options: StoreProductOption[] | null = null;

  try {
    options = await apiFetch<StoreProductOption[]>("/store/options", {
      revalidate: PUBLIC_REVALIDATE.productOptions,
    });
  } catch (error) {
    console.warn("[products] Failed to load storefront options", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (!Array.isArray(options)) {
    return [];
  }

  return options;
}

export async function getProductOptions(slug: string) {
  let options: StoreProductOption[] | null = null;

  try {
    options = await apiFetch<StoreProductOption[]>(
      `/store/products/${slug}/options`,
      {
        revalidate: PUBLIC_REVALIDATE.productOptions,
      },
    );
  } catch (error) {
    console.warn("[products] Failed to load product options", {
      slug,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (!Array.isArray(options)) {
    return [];
  }

  return options;
}
