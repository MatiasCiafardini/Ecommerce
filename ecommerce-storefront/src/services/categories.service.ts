import { apiFetch } from "./api-client";

export async function getCategories() {
  const categories = await apiFetch("/store/categories");

  if (!Array.isArray(categories)) {
    return [];
  }

  return categories;
}
