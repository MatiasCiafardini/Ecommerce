import { apiFetch } from "./api-client";

type Params = {
  category?: string;
  limit?: number;
};

export async function getProducts(params?: Params) {
  let url = "/store/products";

  if (params?.category) {
    url = `/store/categories/${params.category}/products`;
  }

  const products = await apiFetch(url);

  if (!Array.isArray(products)) {
    return [];
  }

  if (params?.limit) {
    return products.slice(0, params.limit);
  }

  return products;
}
export async function getProductBySlug(slug: string) {
  return apiFetch(`/store/products/${slug}`);
}
