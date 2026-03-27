import { apiFetch } from "./api-client";
import { StoreCategory } from "@/types/store";

export async function getCategories(): Promise<StoreCategory[]> {
  const categories = await apiFetch<StoreCategory[]>("/store/categories");

  if (!Array.isArray(categories)) {
    return [];
  }

  return categories;
}
