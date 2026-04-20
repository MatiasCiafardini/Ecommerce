import Image from "next/image";
import Link from "next/link";
import { getCategories } from "@/services/categories.service";
import { resolveAssetUrl } from "@/lib/asset-url";

type CategoryImageStripItem = {
  categorySlug?: string;
  image?: string;
};

type Props = {
  items?: CategoryImageStripItem[];
};

type ResolvedStripItem = {
  slug: string;
  name: string;
  image: string;
};

function formatCategoryName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function CategoryImageStrip({ items }: Props) {
  const configuredItems = Array.isArray(items)
    ? items.filter(
        (item): item is CategoryImageStripItem =>
          Boolean(item && typeof item === "object" && item.categorySlug && item.image),
      )
    : [];

  if (configuredItems.length === 0) {
    return null;
  }

  const categories = await getCategories();
  const categoriesBySlug = new Map(categories.map((category) => [category.slug, category]));

  const resolvedItems: ResolvedStripItem[] = configuredItems.map((item) => {
    const slug = String(item.categorySlug ?? "").trim();
    const category = categoriesBySlug.get(slug);

    return {
      slug,
      name: category?.name?.trim() || formatCategoryName(slug),
      image: String(item.image ?? "").trim(),
    };
  });

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

          return (
            <Link
              key={`${item.slug}-${index}`}
              href={`/category/${item.slug}`}
              aria-label={`Ir a la categoria ${item.name}`}
              style={{
                position: "relative",
                display: "block",
                width: "100%",
                height: 500,
                minHeight: 500,
                overflow: "hidden",
                textDecoration: "none",
                lineHeight: 0,
              }}
            >
              <Image
                src={src}
                alt={item.name}
                fill
                unoptimized
                sizes={`(max-width: 768px) 100vw, ${desktopSizes}`}
                style={{
                  objectFit: "cover",
                  objectPosition: "center center",
                }}
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
