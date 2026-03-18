import { getProducts } from "@/services/products.service";
import ProductCard from "@/components/product/ProductCard";

type Props = {
  title?: string;
  limit?: number;
  columns?: number;
};

export default async function FeaturedProducts({
  title = "Productos destacados",
  limit = 3,
  columns = 3,
}: Props) {
  const products = await getProducts({ limit });

  return (
    <section style={{ padding: "84px 20px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <h2 style={{ marginBottom: "30px", fontSize: "clamp(1.8rem, 3vw, 3rem)", textTransform: "uppercase", letterSpacing: "-0.04em", color: "#fff" }}>
          {title}
        </h2>

        <div
          className="layout-auto-grid"
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
