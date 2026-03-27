import { apiFetch } from "./api-client";
import { StoreProduct } from "@/types/store";

type Params = {
  category?: string;
  limit?: number;
};

export async function getProducts(params?: Params): Promise<StoreProduct[]> {
  let url = "/store/products";

  if (params?.category) {
    url = `/store/categories/${params.category}/products`;
  }

  const products = await apiFetch<StoreProduct[]>(url);

  if (!Array.isArray(products)) {
    return [];
  }

  if (params?.limit) {
    return products.slice(0, params.limit);
  }

  return products;
}
export async function getProductBySlug(slug: string) {
  return apiFetch<StoreProduct>(`/store/products/${slug}`);
}
