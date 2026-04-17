import { getProductBySlug, getProducts } from "@/services/products.service";
import { getProductOptions } from "@/services/product-options.service";
import { getBankTransferDiscountPercentage } from "@/services/payment-config.service";
import ProductView from "@/components/product/ProductView";
import { getTenantConfig } from "@/lib/tenant/get-tenant";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  const [product, productOptions, config, bankTransferDiscountPercentage] = await Promise.all([
    getProductBySlug(slug),
    getProductOptions(slug),
    getTenantConfig(),
    getBankTransferDiscountPercentage(),
  ]);

  if (!product) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 180px)",
          display: "grid",
          placeItems: "center",
          background: "var(--page-shell-bg)",
          color: "var(--text-strong)",
        }}
      >
        Producto no encontrado
      </div>
    );
  }

  const relatedCategory = product.categories?.[0]?.category?.slug;
  const relatedProducts = relatedCategory
    ? (await getProducts({ category: relatedCategory, limit: 4 })).filter(
        (item) => item.slug !== product.slug,
      )
    : [];

  return (
    <ProductView
      product={product}
      productOptions={productOptions}
      relatedProducts={relatedProducts.slice(0, 4)}
      storeId={config.storeId}
      bankTransferDiscountPercentage={bankTransferDiscountPercentage}
    />
  );
}
