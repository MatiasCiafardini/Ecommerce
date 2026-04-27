import { StoreProduct } from "@/types/store";

export function isGiftCardProduct(product: StoreProduct) {
  return (product.categories ?? []).some(
    (entry) => entry.category.slug === "gift-cards",
  );
}
