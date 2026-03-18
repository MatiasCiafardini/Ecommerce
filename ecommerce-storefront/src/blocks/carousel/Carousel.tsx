import { getProducts } from "@/services/products.service";
import ProductCard from "@/components/product/ProductCard";

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
    <section style={{ padding: "72px 20px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <h2 style={{ marginBottom: "24px", fontSize: "clamp(1.8rem, 3vw, 3rem)", textTransform: "uppercase", letterSpacing: "-0.04em", color: "#fff" }}>
          {title}
        </h2>

        <div
          style={{
            display: "flex",
            overflowX: "auto",
            gap: "20px",
            paddingBottom: 8,
            scrollSnapType: "x mandatory",
          }}
        >
          {products.map((product: any) => (
            <div key={product.id} style={{ minWidth: "280px", maxWidth: "280px", scrollSnapAlign: "start" }}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
