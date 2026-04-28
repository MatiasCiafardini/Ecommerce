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
  category?: string;
  limit?: number;
  columns?: number;
  productIds?: number[];
  eyebrow?: string;
  editorialLabel?: string;
  editorialTitle?: string;
};

export default async function ProductGrid({
  category,
  limit = 8,
  columns = 4,
  productIds,
}: Props) {
  const normalizedLimit = normalizeBlockNumber(limit, 8);
  const normalizedColumns = normalizeBlockNumber(columns, 4, {
    min: 0,
    max: 6,
  });
  const normalizedProductIds = normalizeProductIds(productIds);
  const shouldRenderProducts = normalizedColumns > 0;
  const [products, bankTransferDiscountPercentage, config] = await Promise.all([
    shouldRenderProducts
      ? getBlockProducts({
          category,
          limit: normalizedLimit,
          productIds: normalizedProductIds,
        })
      : Promise.resolve([]),
    getBankTransferDiscountPercentage(),
    getTenantConfig(),
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
                  storeId={config.storeId}
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
