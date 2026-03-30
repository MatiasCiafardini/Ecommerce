import Image from "next/image";
import Link from "next/link";
import { getCategories } from "@/services/categories.service";
import { resolveAssetUrl } from "@/lib/asset-url";
import { StoreCategory } from "@/types/store";

type CategoryGridItem = {
  title: string;
  description?: string;
  href?: string;
  image?: string;
  tone?: "soft" | "warm";
};

type Props = {
  title?: string;
  columns?: number;
  items?: CategoryGridItem[];
};

type ResolvedCategoryCard = StoreCategory & {
  description?: string;
  href?: string;
  tone?: "soft" | "warm";
};

export default async function CategoryGrid({
  title = "Categorias",
  columns = 3,
  items,
}: Props) {
  const categories: ResolvedCategoryCard[] = items?.length
    ? items.map((item, index) => ({
        id: index + 1,
        name: item.title,
        slug:
          item.href?.replace(/^\/category\//, "").replace(/^\//, "") ??
          item.title.toLowerCase().replace(/\s+/g, "-"),
        imageUrl: item.image ?? null,
        description: item.description,
        href: item.href ?? `/category/${item.title.toLowerCase().replace(/\s+/g, "-")}`,
        tone: item.tone ?? (index % 2 === 0 ? "soft" : "warm"),
      }))
    : (await getCategories()).map((category, index) => ({
        ...category,
        description: "Ver seleccion",
        href: `/category/${category.slug}`,
        tone: index % 2 === 0 ? "soft" : "warm",
      }));

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
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={cat.href ?? `/category/${cat.slug}`}
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
                data-tone={cat.tone ?? "soft"}
                style={{
                  minHeight: 170,
                  borderRadius: "var(--theme-radius-media)",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.78), rgba(245,232,220,0.52))",
                  display: "grid",
                  placeItems: "center",
                  color: "rgba(35,24,21,0.68)",
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  fontSize: 12,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {cat.imageUrl ? (
                  <Image
                    src={resolveAssetUrl(cat.imageUrl) ?? cat.imageUrl}
                    alt={cat.name}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 33vw"
                    style={{
                      objectFit: "contain",
                      objectPosition: "center center",
                      padding: 12,
                    }}
                  />
                ) : (
                  "Placeholder"
                )}
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
                  {cat.description ?? "Ver seleccion"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
