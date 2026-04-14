import { apiFetch } from "./api-client";
import { StoreProduct } from "@/types/store";

type Params = {
  category?: string;
  limit?: number;
  productIds?: number[];
};

export async function getProducts(params?: Params): Promise<StoreProduct[]> {
  const query = new URLSearchParams();

  if (Array.isArray(params?.productIds) && params.productIds.length > 0) {
    query.set("productIds", params.productIds.join(","));
  }

  const hasCuratedProducts =
    Array.isArray(params?.productIds) && params.productIds.length > 0;

  let url = "/store/products";

  if (params?.category && !hasCuratedProducts) {
    url = `/store/categories/${params.category}/products`;
  }

  if (query.size > 0) {
    url = `${url}?${query.toString()}`;
  }

  let products: StoreProduct[] | null = null;

  try {
    products = await apiFetch<StoreProduct[]>(url);
  } catch (error) {
    console.error("[products] Failed to load storefront products", {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (!Array.isArray(products)) {
    return [];
  }

  if (params?.limit) {
    return products.slice(0, params.limit);
  }

  return products;
}
export async function getProductBySlug(slug: string) {
  try {
    return await apiFetch<StoreProduct>(`/store/products/${slug}`);
  } catch (error) {
    console.error("[products] Failed to load storefront product", {
      slug,
      error: error instanceof Error ? error.message : String(error),
    });

    return null;
  }
}
