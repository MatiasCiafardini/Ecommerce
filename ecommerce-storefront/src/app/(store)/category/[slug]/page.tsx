import { getProducts } from "@/services/products.service";
import ProductCard from "@/components/product/ProductCard";
import { getTenantConfig } from "@/lib/tenant/get-tenant";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const [products, config] = await Promise.all([
    getProducts({ category: slug }),
    getTenantConfig(),
  ]);
  const categoryTitle = slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const isMiMaria = config.storeId === 3005;

  return (
    <section
      style={{
        padding: "72px 20px",
        background: "var(--page-shell-bg)",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <h1
          style={{
            fontSize: "clamp(2.5rem, 5vw, 4.8rem)",
            letterSpacing: isMiMaria ? "-0.04em" : "-0.05em",
            marginBottom: 12,
            color: "var(--text-strong)",
          }}
        >
          {categoryTitle}
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 28 }}>
          {isMiMaria
            ? "Explora una seleccion cuidada de prendas femeninas para vestir con equilibrio, suavidad y elegancia."
            : "Curaduria de prendas pensadas para armar un uniforme urbano simple, solido y versatil."}
        </p>

        <div
          className="layout-product-grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, var(--product-card-width))",
            justifyContent: "center",
          }}
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
