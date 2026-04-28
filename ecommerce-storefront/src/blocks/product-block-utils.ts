import { getProducts } from "@/services/products.service";
import { StoreProduct } from "@/types/store";

export function normalizeBlockNumber(
  value: unknown,
  fallback: number,
  options?: { min?: number; max?: number },
) {
  const parsed = Number(value);
  const min = options?.min ?? 1;
  const max = options?.max ?? 24;
  const base = Number.isFinite(parsed) ? Math.floor(parsed) : fallback;

  return Math.min(Math.max(base, min), max);
}

export function normalizeProductIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  ];
}

export async function getBlockProducts({
  category,
  limit,
  productIds,
}: {
  category?: string;
  limit: number;
  productIds?: number[];
}): Promise<StoreProduct[]> {
  const curatedIds = normalizeProductIds(productIds);

  if (curatedIds.length === 0) {
    return getProducts({ category, limit });
  }

  const curatedProducts = await getProducts({
    productIds: curatedIds,
    limit,
  });

  if (curatedProducts.length >= limit) {
    return curatedProducts.slice(0, limit);
  }

  const fallbackProducts = await getProducts({ category, limit });
  const selectedIds = new Set(curatedProducts.map((product) => product.id));
  const mergedProducts = [
    ...curatedProducts,
    ...fallbackProducts.filter((product) => !selectedIds.has(product.id)),
  ];

  return mergedProducts.slice(0, limit);
}
