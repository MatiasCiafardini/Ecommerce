import Link from "next/link";
import { getCategories } from "@/services/categories.service";
import { concreteTexture, editorialLines } from "@/themes/minimal/visuals";

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
    <section style={{ padding: "84px 20px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <h2
          style={{
            marginBottom: "30px",
            fontSize: "clamp(1.8rem, 3vw, 3rem)",
            textTransform: "uppercase",
            letterSpacing: "-0.04em",
            color: "#fff",
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
          {categories.map((cat: any, index: number) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="theme-hover-lift"
              style={{
                textDecoration: "none",
                color: "inherit",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 28,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
                minHeight: 280,
                padding: 22,
                display: "grid",
                alignContent: "space-between",
                overflow: "hidden",
              }}
            >
              <div
                className="theme-ambient-pan"
                style={{
                  minHeight: 170,
                  borderRadius: 22,
                  background:
                    index % 2 === 0
                      ? `linear-gradient(135deg, #2a2a2a 0%, #83786a 100%), ${editorialLines}, ${concreteTexture}`
                      : `linear-gradient(135deg, #171717 0%, #8e6d54 100%), ${editorialLines}, ${concreteTexture}`,
                  display: "grid",
                  placeItems: "center",
                  color: "rgba(255,255,255,0.78)",
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  fontSize: 12,
                  backgroundSize: "cover, cover, cover",
                }}
              >
                Placeholder
              </div>

              <div>
                <h3
                  style={{
                    marginTop: 18,
                    marginBottom: 8,
                    fontSize: 24,
                    textTransform: "uppercase",
                    color: "#fff",
                  }}
                >
                  {cat.name}
                </h3>
                <p style={{ color: "rgba(250,244,236,0.7)", margin: 0 }}>
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
