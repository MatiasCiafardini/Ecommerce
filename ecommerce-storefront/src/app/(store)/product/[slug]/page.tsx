import { getProductBySlug } from "@/services/products.service";
import { getProductOptions } from "@/services/product-options.service";
import ProductView from "@/components/product/ProductView";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  const [product, productOptions] = await Promise.all([
    getProductBySlug(slug),
    getProductOptions(slug),
  ]);

  if (!product) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 180px)",
          display: "grid",
          placeItems: "center",
          background:
            "radial-gradient(circle at top, rgba(255,255,255,0.06), transparent 30%), #0b0b0b",
          color: "#f7f1e8",
        }}
      >
        Producto no encontrado
      </div>
    );
  }

  return <ProductView product={product} productOptions={productOptions} />;
}
