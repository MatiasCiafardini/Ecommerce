import { getProducts } from "@/services/products.service";
import { getStoreProductOptions } from "@/services/product-options.service";
import { getBankTransferDiscountPercentage } from "@/services/payment-config.service";
import CatalogView from "@/components/store/CatalogView";
import { getTenantConfig } from "@/lib/tenant/get-tenant";

export const dynamic = "force-dynamic";

const hiddenCatalogCategorySlugs = new Set(["gift-cards"]);

type ProductsPageProps = {
  searchParams?: Promise<{
    category?: string;
    categories?: string;
  }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialCategories = (
    resolvedSearchParams?.categories
      ? resolvedSearchParams.categories.split(",")
      : resolvedSearchParams?.category
        ? [resolvedSearchParams.category]
        : []
  )
    .map((category) => category.trim().toLowerCase())
    .filter(Boolean);
  const [products, storeOptions, config, bankTransferDiscountPercentage] = await Promise.all([
    getProducts(),
    getStoreProductOptions(),
    getTenantConfig(),
    getBankTransferDiscountPercentage(),
  ]);
  const catalogProducts = products.filter(
    (product) =>
      !(product.categories ?? []).some((entry) =>
        hiddenCatalogCategorySlugs.has(entry.category.slug),
      ),
  );

  return (
    <CatalogView
      products={catalogProducts}
      storeOptions={storeOptions}
      storeId={config.storeId}
      initialCategories={initialCategories}
      bankTransferDiscountPercentage={bankTransferDiscountPercentage}
    />
  );
}
