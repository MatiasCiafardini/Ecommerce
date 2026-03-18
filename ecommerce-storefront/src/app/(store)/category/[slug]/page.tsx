import { getProducts } from "@/services/products.service";
import ProductCard from "@/components/product/ProductCard";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const products = await getProducts({ category: slug });

  return (
    <section
      style={{
        padding: "72px 20px",
        background:
          "radial-gradient(circle at top left, rgba(255,255,255,0.06), transparent 28%), linear-gradient(180deg, #141414 0%, #0b0b0b 100%)",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <h1
          style={{
            fontSize: "clamp(2.5rem, 5vw, 4.8rem)",
            textTransform: "uppercase",
            letterSpacing: "-0.05em",
            marginBottom: 12,
            color: "#ffffff",
          }}
        >
          {slug.replace("-", " ")}
        </h1>
        <p style={{ color: "rgba(250,244,236,0.76)", marginBottom: 28 }}>
          Curaduria de prendas pensadas para armar un uniforme urbano simple,
          solido y versatil.
        </p>

        <div
          className="layout-product-grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
