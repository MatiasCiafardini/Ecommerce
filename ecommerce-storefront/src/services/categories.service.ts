import { PUBLIC_REVALIDATE, apiFetch } from "./api-client";
import { StoreCategory } from "@/types/store";

export async function getCategories(): Promise<StoreCategory[]> {
  let categories: StoreCategory[] | null = null;

  try {
    categories = await apiFetch<StoreCategory[]>("/store/categories", {
      revalidate: PUBLIC_REVALIDATE.categories,
    });
  } catch (error) {
    console.error("[categories] Failed to load storefront categories", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (!Array.isArray(categories)) {
    return [];
  }

  return categories;
}
