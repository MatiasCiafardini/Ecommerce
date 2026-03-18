import { getProducts } from "@/services/products.service";
import ProductCard from "@/components/product/ProductCard";

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
    <section style={{ padding: "80px 20px" }}>
      {title && <h2 style={{ marginBottom: "30px" }}>{title}</h2>}

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
