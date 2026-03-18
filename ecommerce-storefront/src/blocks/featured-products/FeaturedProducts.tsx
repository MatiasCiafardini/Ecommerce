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
    <section style={{ padding: "60px 20px" }}>
      <h2 style={{ marginBottom: "30px" }}>{title}</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns},1fr)`,
          gap: "20px",
        }}
      >
        {products.map((product: any) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
