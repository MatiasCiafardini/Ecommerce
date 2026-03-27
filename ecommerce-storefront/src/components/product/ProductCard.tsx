import Image from "next/image";
import Link from "next/link";
import { StoreProduct } from "@/types/store";
import { resolveAssetUrl } from "@/lib/asset-url";
import { formatCurrency, roundCurrency } from "@/lib/currency";
import { getCatalogImageTransform } from "@/lib/product-image-layout";

type Props = {
  product: StoreProduct;
};

export default function ProductCard({ product }: Props) {
  const imageUrl =
    product.images && product.images.length > 0
      ? resolveAssetUrl(product.images[0].url)
      : null;

  const fallbackPrice = Number(product.variants?.[0]?.price ?? product.price ?? 0);
  const hasPromotion = Boolean(product.pricing?.hasActivePromotion);
  const displayPrice = hasPromotion
    ? roundCurrency(product.pricing?.finalPrice ?? fallbackPrice)
    : roundCurrency(fallbackPrice);
  const basePrice = hasPromotion
    ? roundCurrency(product.pricing?.basePrice ?? fallbackPrice)
    : roundCurrency(fallbackPrice);

  return (
    <Link
      href={`/product/${product.slug}`}
      className="theme-hover-lift theme-block-card theme-product-card"
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "grid",
        gridTemplateRows: "var(--product-card-media-height) 1fr",
        width: "var(--product-card-width)",
        maxWidth: "100%",
        height: "var(--product-card-height)",
        minHeight: "var(--product-card-height)",
        border: "1px solid var(--border-soft)",
        borderRadius: "var(--theme-radius-card)",
        overflow: "hidden",
      }}
    >
      <div
        className="product-card-media"
        data-has-image={imageUrl ? "true" : "false"}
        style={{
          height: "var(--product-card-media-height)",
          minHeight: "var(--product-card-media-height)",
          maxHeight: "var(--product-card-media-height)",
          background: "#ffffff",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
          borderBottom: "1px solid var(--border-soft)",
          position: "relative",
          zIndex: 0,
        }}
      >
        {hasPromotion ? (
          <span
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              zIndex: 2,
              padding: "8px 10px",
              borderRadius: "var(--theme-radius-pill)",
              background: "var(--accent)",
              color: "var(--accent-contrast, #fff)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            -{product.pricing?.discountPercentage}%
          </span>
        ) : null}

        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            unoptimized
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              display: "block",
              pointerEvents: "none",
              ...getCatalogImageTransform(product.images?.[0]),
            }}
          />
        ) : (
          <span
            style={{
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              fontSize: 12,
            }}
          >
            Product placeholder
          </span>
        )}
      </div>

      <div
        className="product-card-copy"
        style={{
          minHeight: "var(--product-card-copy-min-height)",
          display: "grid",
          alignContent: "start",
          gap: 6,
          position: "relative",
          zIndex: 1,
        }}
      >
        {displayPrice > 0 ? (
          <div style={{ display: "grid", gap: 6 }}>
            {hasPromotion ? (
              <p
                style={{
                  margin: 0,
                  color: "var(--text-muted)",
                  textDecoration: "line-through",
                }}
              >
                {formatCurrency(basePrice)}
              </p>
            ) : null}
            <p className="product-card-price" style={{ margin: 0, fontWeight: 700, color: "var(--text-strong)" }}>
              {formatCurrency(displayPrice)}
            </p>
          </div>
        ) : (
          <p className="product-card-price" style={{ margin: 0, color: "var(--text-muted)" }}>
            Consultar precio
          </p>
        )}
        <h3 className="product-card-title" style={{ margin: 0, color: "var(--text-strong)" }}>
          {product.title}
        </h3>
        <p
          className="product-card-kicker"
          style={{
            margin: 0,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.16em",
          }}
        >
          Streetwear essential
        </p>
      </div>
    </Link>
  );
}
