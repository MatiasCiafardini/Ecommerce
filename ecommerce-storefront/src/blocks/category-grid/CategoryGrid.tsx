import Link from "next/link";
import { getCategories } from "@/services/categories.service";
import { StoreCategory } from "@/types/store";

type Props = {
  title?: string;
  columns?: number;
};

export default async function CategoryGrid({
  title = "Categorias",
  columns = 3,
}: Props) {
  const categories = await getCategories();

  return (
    <section
      className="theme-block-section theme-block-section--category"
      style={{
        padding: "84px 20px",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <h2
          style={{
            marginBottom: "30px",
            fontSize: "clamp(1.8rem, 3vw, 3rem)",
            textTransform: "uppercase",
            letterSpacing: "-0.04em",
            color: "var(--text-strong)",
          }}
        >
          {title}
        </h2>

        <div
          className="layout-auto-grid"
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`,
          }}
        >
          {categories.map((cat: StoreCategory, index: number) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="theme-hover-lift theme-block-card theme-category-card"
              style={{
                textDecoration: "none",
                color: "inherit",
                border: "1px solid var(--border-soft)",
                borderRadius: "var(--theme-radius-card)",
                minHeight: 280,
                padding: 22,
                display: "grid",
                alignContent: "space-between",
                overflow: "hidden",
              }}
            >
              <div
                className="theme-ambient-pan theme-category-media"
                data-tone={index % 2 === 0 ? "soft" : "warm"}
                style={{
                  minHeight: 170,
                  borderRadius: "var(--theme-radius-media)",
                  background:
                    cat.imageUrl
                      ? `var(--category-image-overlay), url(${cat.imageUrl})`
                      : undefined,
                  display: "grid",
                  placeItems: "center",
                  color: "rgba(35,24,21,0.68)",
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  fontSize: 12,
                  backgroundSize: cat.imageUrl ? "cover" : "cover, cover, cover",
                  backgroundPosition: cat.imageUrl ? "center" : "center",
                }}
              >
                {cat.imageUrl ? "" : "Placeholder"}
              </div>

              <div>
                <h3
                  style={{
                    marginTop: 18,
                    marginBottom: 8,
                    fontSize: 24,
                    textTransform: "uppercase",
                    color: "var(--text-strong)",
                  }}
                >
                  {cat.name}
                </h3>
                <p style={{ color: "var(--text-muted)", margin: 0 }}>
                  Ver seleccion
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
