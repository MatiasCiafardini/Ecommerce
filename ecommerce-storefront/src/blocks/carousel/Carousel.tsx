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
    <section style={{ padding: "40px 20px" }}>
      <h2 style={{ marginBottom: "20px" }}>{title}</h2>

      <div
        style={{
          display: "flex",
          overflowX: "auto",
          gap: "20px",
        }}
      >
        {products.map((product: any) => (
          <div key={product.id} style={{ minWidth: "220px" }}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
