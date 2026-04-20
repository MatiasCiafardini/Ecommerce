import { getProducts } from "@/services/products.service";
import { getBankTransferDiscountPercentage } from "@/services/payment-config.service";
import ProductCard from "@/components/product/ProductCard";
import StaggerReveal from "@/components/motion/StaggerReveal";
import { StoreProduct } from "@/types/store";

type Props = {
  title?: string;
  category?: string;
  limit?: number;
  columns?: number;
  productIds?: number[];
  eyebrow?: string;
  editorialLabel?: string;
  editorialTitle?: string;
};

export default async function ProductGrid({
  title = "Productos",
  category,
  limit = 8,
  columns = 4,
  productIds,
  eyebrow = "Curado para el street",
  editorialLabel = "Urban people",
  editorialTitle = "Editorial street energy",
}: Props) {
  const normalizedColumns = Number.isFinite(columns) ? Math.max(0, Math.floor(columns)) : 4;
  const shouldRenderProducts = normalizedColumns > 0;
  const [products, bankTransferDiscountPercentage] = await Promise.all([
    shouldRenderProducts ? getProducts({ category, limit, productIds }) : Promise.resolve([]),
    getBankTransferDiscountPercentage(),
  ]);

  return (
    <section
      className="theme-block-section theme-block-section--product-grid"
      style={{
        padding: "20px 20px",
      }}
    >
      <div style={{ maxWidth: "var(--store-wide-max)", margin: "0 auto" }}>
        {shouldRenderProducts ? (
          <div
            className="layout-product-grid"
            style={{
              gridTemplateColumns: `repeat(${normalizedColumns}, var(--product-card-width))`,
              justifyContent: "center",
            }}
          >
            {products.map((product: StoreProduct, index: number) => (
              <StaggerReveal key={product.id} delayMs={index * 90}>
                <ProductCard
                  product={product}
                  bankTransferDiscountPercentage={bankTransferDiscountPercentage}
                />
              </StaggerReveal>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
