import { getProducts } from "@/services/products.service";
import ProductCard from "@/components/product/ProductCard";
import {
  concreteTexture,
  editorialLines,
  urbanCrowdScene,
} from "@/themes/minimal/visuals";

type Props = {
  title?: string;
  category?: string;
  limit?: number;
  columns?: number;
};

export default async function ProductGrid({
  title = "Productos",
  category,
  limit = 8,
  columns = 4,
}: Props) {
  const products = await getProducts({ category, limit });

  return (
    <section style={{ padding: "84px 20px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {title && (
          <div
            className="layout-feature-split"
            style={{
              marginBottom: 28,
            }}
          >
            <div
              style={{
                borderRadius: 32,
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
                padding: "28px",
                display: "grid",
                alignContent: "end",
                minHeight: 240,
              }}
            >
              <span
                style={{
                  color: "rgba(250,244,236,0.68)",
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  fontSize: 12,
                  marginBottom: 14,
                }}
              >
                Curado para el street
              </span>
              <h2
                style={{
                  margin: 0,
                  fontSize: "clamp(1.8rem, 3vw, 3rem)",
                  textTransform: "uppercase",
                  letterSpacing: "-0.04em",
                  color: "#fff",
                }}
              >
                {title}
              </h2>
            </div>

            <div
              className="theme-hover-lift theme-ambient-pan"
              style={{
                minHeight: 240,
                borderRadius: 32,
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  `linear-gradient(135deg, rgba(12,12,12,0.14), rgba(243,238,231,0.06)), ${urbanCrowdScene}, ${editorialLines}, ${concreteTexture}`,
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
                  background:
                    "linear-gradient(90deg, rgba(11,11,11,0.18) 0%, rgba(11,11,11,0.04) 46%, rgba(243,238,231,0.04) 100%)",
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
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(10,10,10,0.32)",
                    color: "#fff",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  Urban people
                </span>
                <strong
                  className="feature-title"
                  style={{
                    color: "#fff",
                    textTransform: "uppercase",
                    letterSpacing: "-0.03em",
                  }}
                >
                  Editorial street energy
                </strong>
              </div>
            </div>
          </div>
        )}

        <div
          className="layout-product-grid"
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`,
          }}
        >
          {products.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
