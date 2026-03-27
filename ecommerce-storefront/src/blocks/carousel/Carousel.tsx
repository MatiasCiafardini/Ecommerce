import { getProducts } from "@/services/products.service";
import ProductCard from "@/components/product/ProductCard";
import { StoreProduct } from "@/types/store";

type Props = {
  title?: string;
  limit?: number;
};

export default async function Carousel({
  title = "Destacados",
  limit = 6,
}: Props) {
  const products = await getProducts({ limit });

  return (
    <section
      className="theme-block-section theme-block-section--carousel"
      style={{
        padding: "72px 20px",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
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
          {products.map((product: StoreProduct) => (
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
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
