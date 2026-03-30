import { getProducts } from "@/services/products.service";
import { getStoreProductOptions } from "@/services/product-options.service";
import CatalogView from "@/components/store/CatalogView";
import { getTenantConfig } from "@/lib/tenant/get-tenant";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [products, storeOptions, config] = await Promise.all([
    getProducts(),
    getStoreProductOptions(),
    getTenantConfig(),
  ]);

  return (
    <CatalogView
      products={products}
      storeOptions={storeOptions}
      storeId={config.storeId}
    />
  );
}
