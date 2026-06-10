import Image from "next/image";
import Link from "next/link";
import { resolveAssetUrl } from "@/lib/asset-url";

type CategoryImageStripItem = {
  title?: string;
  image?: string;
  categorySlugs?: string[];
};

type Props = {
  items?: CategoryImageStripItem[];
};

type ResolvedStripItem = {
  title: string;
  image: string;
  categorySlugs: string[];
};

export default function CategoryImageStrip({ items }: Props) {
  const resolvedItems: ResolvedStripItem[] = Array.isArray(items)
    ? items
        .map((item) => {
          const title = String(item?.title ?? "").trim();
          const image = String(item?.image ?? "").trim();
          const categorySlugs = Array.isArray(item?.categorySlugs)
            ? item.categorySlugs
                .map((slug) => String(slug).trim().toLowerCase())
                .filter(Boolean)
            : [];

          return {
            title,
            image,
            categorySlugs,
          };
        })
        .filter(
          (item) =>
            Boolean(item.title) &&
            Boolean(item.image) &&
            item.categorySlugs.length > 0,
        )
    : [];

  if (resolvedItems.length === 0) {
    return null;
  }

  const desktopSizes = `${Math.max(100 / resolvedItems.length, 20).toFixed(0)}vw`;

  return (
    <section
      className="theme-block-section theme-block-section--category-image-strip"
      style={{
        padding: 0,
        width: "100%",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(1, resolvedItems.length)}, minmax(0, 1fr))`,
          gap: 0,
          width: "100%",
        }}
      >
        {resolvedItems.map((item, index) => {
          const src = resolveAssetUrl(item.image) ?? item.image;
          const href = `/product?categories=${encodeURIComponent(item.categorySlugs.join(","))}`;

          return (
            <Link
              key={`${item.title}-${index}`}
              href={href}
              aria-label={`Ir al catalogo filtrado por ${item.title}`}
              style={{
                position: "relative",
                display: "block",
                width: "100%",
                height: 500,
                minHeight: 500,
                overflow: "hidden",
                textDecoration: "none",
                lineHeight: 0,
                color: "white",
              }}
            >
              <Image
                src={src}
                alt={item.title}
                fill
                sizes={`(max-width: 768px) 100vw, ${desktopSizes}`}
                style={{
                  objectFit: "cover",
                  objectPosition: "center center",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.18) 48%, rgba(0,0,0,0.32) 100%)",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  inset: "auto 24px 24px 24px",
                  display: "grid",
                  gap: 6,
                  zIndex: 1,
                }}
              >
                <span
                  style={{
                    fontSize: "clamp(1.6rem, 2.5vw, 2.6rem)",
                    fontWeight: 700,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                  }}
                >
                  {item.title}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
