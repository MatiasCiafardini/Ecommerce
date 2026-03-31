import { getProducts } from "@/services/products.service";
import ProductCard from "@/components/product/ProductCard";
import StaggerReveal from "@/components/motion/StaggerReveal";
import { StoreProduct } from "@/types/store";

type Props = {
  title?: string;
  limit?: number;
  productIds?: number[];
};

export default async function Carousel({
  title = "Destacados",
  limit = 6,
  productIds,
}: Props) {
  const products = await getProducts({ limit, productIds });

  return (
    <section
      className="theme-block-section theme-block-section--carousel"
      style={{
        padding: "72px 20px",
      }}
    >
      <div style={{ maxWidth: "var(--store-wide-max)", margin: "0 auto" }}>
        <h2 style={{ marginBottom: "24px", fontSize: "clamp(1.8rem, 3vw, 3rem)", textTransform: "uppercase", letterSpacing: "-0.04em", color: "var(--text-strong)" }}>
          {title}
        </h2>

        <div
          className="theme-horizontal-scroll"
          style={{
            display: "flex",
            overflowX: "auto",
            gap: "20px",
            paddingBottom: 8,
            scrollSnapType: "x mandatory",
          }}
        >
          {products.map((product: StoreProduct, index: number) => (
            <div
              key={product.id}
              style={{
                width: "var(--product-card-width)",
                minWidth: "var(--product-card-width)",
                maxWidth: "var(--product-card-width)",
                flex: "0 0 var(--product-card-width)",
                scrollSnapAlign: "start",
              }}
            >
              <StaggerReveal delayMs={index * 90}>
                <ProductCard product={product} />
              </StaggerReveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
