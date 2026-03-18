import { getProductBySlug } from "@/services/products.service";
import ProductView from "@/components/product/ProductView";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  const product = await getProductBySlug(slug);

  if (!product) {
    return <div>Producto no encontrado</div>;
  }

  return <ProductView product={product} />;
}
