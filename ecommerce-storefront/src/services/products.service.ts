import { PUBLIC_REVALIDATE, apiFetch } from "./api-client";
import { StoreProduct } from "@/types/store";

type Params = {
  category?: string;
  limit?: number;
  productIds?: number[];
  search?: string;
};

const hasAvailableStock = (product: StoreProduct) =>
  (product.variants ?? []).some((variant) =>
    (variant.inventories ?? []).some(
      (inventory) =>
        Math.max(
          Number(inventory.quantity ?? 0) - Number(inventory.reserved ?? 0),
          0,
        ) > 0,
    ),
  );

function reportProductsFallback(args: {
  scope: "list" | "detail";
  target: string;
  error: unknown;
}) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.warn("[products] Falling back to empty storefront data", {
    scope: args.scope,
    target: args.target,
    error: args.error instanceof Error ? args.error.message : String(args.error),
  });
}

export async function getProducts(params?: Params): Promise<StoreProduct[]> {
  const query = new URLSearchParams();

  if (Array.isArray(params?.productIds) && params.productIds.length > 0) {
    query.set("productIds", params.productIds.join(","));
  }

  const search = params?.search?.trim();

  if (search) {
    query.set("search", search);
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
    products = await apiFetch<StoreProduct[]>(url, {
      revalidate: PUBLIC_REVALIDATE.products,
    });
  } catch (error) {
    reportProductsFallback({
      scope: "list",
      target: url,
      error,
    });
  }

  if (!Array.isArray(products)) {
    return [];
  }

  const availableProducts = products.filter(hasAvailableStock);

  if (params?.limit) {
    return availableProducts.slice(0, params.limit);
  }

  return availableProducts;
}
export async function getProductBySlug(slug: string) {
  try {
    return await apiFetch<StoreProduct>(`/store/products/${slug}`, {
      revalidate: PUBLIC_REVALIDATE.productDetail,
    });
  } catch (error) {
    reportProductsFallback({
      scope: "detail",
      target: slug,
      error,
    });

    return null;
  }
}
