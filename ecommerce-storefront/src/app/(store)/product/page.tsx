import { getProducts } from "@/services/products.service";
import CatalogView from "@/components/store/CatalogView";

export default async function ProductsPage() {
  const products = await getProducts();

  return <CatalogView products={products} />;
}
