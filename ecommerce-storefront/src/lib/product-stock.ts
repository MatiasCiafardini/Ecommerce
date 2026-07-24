import type { StoreProduct } from "@/types/store";

export function hasAvailableStock(product: StoreProduct) {
  return (product.variants ?? []).some((variant) =>
    (variant.inventories ?? []).some(
      (inventory) =>
        Math.max(
          Number(inventory.quantity ?? 0) - Number(inventory.reserved ?? 0),
          0,
        ) > 0,
    ),
  );
}
