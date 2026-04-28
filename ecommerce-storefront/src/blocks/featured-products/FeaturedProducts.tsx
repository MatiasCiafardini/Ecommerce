import { getBankTransferDiscountPercentage } from "@/services/payment-config.service";
import ProductCard from "@/components/product/ProductCard";
import StaggerReveal from "@/components/motion/StaggerReveal";
import { getTenantConfig } from "@/lib/tenant/get-tenant";
import { StoreProduct } from "@/types/store";
import {
  getBlockProducts,
  normalizeBlockNumber,
  normalizeProductIds,
} from "@/blocks/product-block-utils";

type Props = {
  title?: string;
  limit?: number;
  columns?: number;
  productIds?: number[];
};

export default async function FeaturedProducts({
  title = "Productos destacados",
  limit = 6,
  columns = 3,
  productIds,
}: Props) {
  const normalizedLimit = normalizeBlockNumber(limit, 6);
  const normalizedColumns = normalizeBlockNumber(columns, 3, { max: 6 });
  const normalizedProductIds = normalizeProductIds(productIds);
  const [products, bankTransferDiscountPercentage, config] = await Promise.all([
    getBlockProducts({
      limit: normalizedLimit,
      productIds: normalizedProductIds,
    }),
    getBankTransferDiscountPercentage(),
    getTenantConfig(),
  ]);

  return (
    <section
      className="theme-block-section theme-block-section--featured"
      style={{
        padding: "20px 20px",
      }}
    >
      <div style={{ maxWidth: "var(--store-wide-max)", margin: "0 auto" }}>
        <h2 style={{ marginBottom: "30px", fontSize: "clamp(1.8rem, 3vw, 3rem)", textTransform: "uppercase", letterSpacing: "-0.04em", color: "var(--text-strong)" }}>
          {title}
        </h2>

        <div
          className="layout-auto-grid"
          style={{
            gridTemplateColumns: `repeat(${normalizedColumns}, var(--product-card-width))`,
            justifyContent: "center",
          }}
        >
          {products.map((product: StoreProduct, index: number) => (
            <StaggerReveal key={product.id} delayMs={index * 90}>
              <ProductCard
                product={product}
                storeId={config.storeId}
                bankTransferDiscountPercentage={bankTransferDiscountPercentage}
              />
            </StaggerReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
