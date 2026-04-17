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
  const featurePanelHeight = "clamp(260px, 30vw, 340px)";

  return (
    <section
      className="theme-block-section theme-block-section--product-grid"
      style={{
        padding: "84px 20px",
      }}
    >
      <div style={{ maxWidth: "var(--store-wide-max)", margin: "0 auto" }}>
        {title && (
          <div
            className="layout-feature-split"
            style={{
              marginBottom: 28,
            }}
          >
            <div
              className="theme-block-panel"
              style={{
                borderRadius: "var(--theme-radius-panel)",
                border: "1px solid var(--border-soft)",
                padding: "28px",
                display: "grid",
                alignContent: "end",
                minHeight: featurePanelHeight,
                height: featurePanelHeight,
              }}
            >
              <span
                style={{
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  fontSize: 12,
                  marginBottom: 14,
                }}
              >
                {eyebrow}
              </span>
              <h2
                style={{
                  margin: 0,
                  fontSize: "clamp(1.8rem, 3vw, 3rem)",
                  textTransform: "uppercase",
                  letterSpacing: "-0.04em",
                  color: "var(--text-strong)",
                }}
              >
                {title}
              </h2>
            </div>

            <div
              className="theme-hover-lift theme-ambient-pan theme-editorial-panel"
              style={{
                minHeight: featurePanelHeight,
                height: featurePanelHeight,
                borderRadius: "var(--theme-radius-panel)",
                border: "1px solid var(--border-soft)",
                backgroundSize: "cover, cover, cover, cover",
                backgroundPosition: "center, center, center, center",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "var(--editorial-panel-overlay)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 24,
                  bottom: 22,
                  display: "grid",
                  gap: 8,
                }}
              >
                <span
                  className="feature-kicker"
                  style={{
                    display: "inline-flex",
                    width: "fit-content",
                    padding: "8px 12px",
                    borderRadius: "var(--theme-radius-pill)",
                    border: "1px solid var(--border-soft)",
                    background: "var(--editorial-pill-bg)",
                    color: "var(--text-strong)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  {editorialLabel}
                </span>
                <strong
                  className="feature-title"
                  style={{
                    color: "var(--text-strong)",
                    textTransform: "uppercase",
                    letterSpacing: "-0.03em",
                    textShadow: "var(--editorial-title-shadow)",
                  }}
                >
                  {editorialTitle}
                </strong>
              </div>
            </div>
          </div>
        )}

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
