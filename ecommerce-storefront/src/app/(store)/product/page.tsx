import { getProducts } from "@/services/products.service";
import { getStoreProductOptions } from "@/services/product-options.service";
import CatalogView from "@/components/store/CatalogView";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [products, storeOptions] = await Promise.all([
    getProducts(),
    getStoreProductOptions(),
  ]);

  return <CatalogView products={products} storeOptions={storeOptions} />;
}
