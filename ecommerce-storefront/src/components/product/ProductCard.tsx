import Image from "next/image";
import Link from "next/link";
import { StoreProduct } from "@/types/store";
import { resolveAssetUrl } from "@/lib/asset-url";
import { formatCurrency, roundCurrency } from "@/lib/currency";
import { getCatalogImageTransform } from "@/lib/product-image-layout";
import { isGiftCardProduct } from "@/lib/product-kind";

type Props = {
  product: StoreProduct;
  bankTransferDiscountPercentage?: number;
  storeId?: number;
};

export default function ProductCard({
  product,
  bankTransferDiscountPercentage = 0,
  storeId,
}: Props) {
  const imageUrl =
    product.images && product.images.length > 0
      ? resolveAssetUrl(product.images[0].url)
      : null;

  const fallbackPrice = Number(
    product.variants?.[0]?.price ?? product.price ?? 0,
  );
  const hasPromotion = Boolean(product.pricing?.hasActivePromotion);
  const hasBuyXGetY = Boolean(product.pricing?.hasBuyXGetYPromotion);
  const isGiftCard = isGiftCardProduct(product);
  const displayPrice = hasPromotion
    ? roundCurrency(product.pricing?.finalPrice ?? fallbackPrice)
    : roundCurrency(fallbackPrice);
  const basePrice = hasPromotion
    ? roundCurrency(product.pricing?.basePrice ?? fallbackPrice)
    : roundCurrency(fallbackPrice);
  const transferPrice =
    !isGiftCard && displayPrice > 0 && bankTransferDiscountPercentage > 0
      ? roundCurrency(
          Math.max(
            displayPrice * (1 - bankTransferDiscountPercentage / 100),
            0,
          ),
        )
      : null;
  const showInstallments = storeId !== 3;
  const installmentPrice =
    showInstallments && displayPrice > 0 ? roundCurrency(displayPrice / 3) : null;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="theme-hover-lift theme-block-card theme-product-card"
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "grid",
        gridTemplateRows: "var(--product-card-media-height) 1fr",
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        height: "var(--product-card-height)",
        minHeight: "var(--product-card-height)",
        border: "1px solid var(--border-soft)",
        borderRadius: 0,
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
              padding: "8px 12px",
              borderRadius: 0,
              background:
                "color-mix(in srgb, var(--paper, #fffdf9) 84%, var(--accent, #8f7868) 16%)",
              border:
                "1px solid color-mix(in srgb, var(--border-soft, rgba(0,0,0,0.12)) 68%, var(--accent, #8f7868) 32%)",
              boxShadow: "0 10px 24px rgba(56, 34, 24, 0.08)",
              color: "var(--text-strong, #6a5247)",
              letterSpacing: "0.08em",
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1,
              backdropFilter: "blur(8px)",
            }}
          >
            -{product.pricing?.discountPercentage}%
          </span>
        ) : hasBuyXGetY ? (
          <span
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              zIndex: 2,
              padding: "8px 12px",
              borderRadius: 0,
              background:
                "color-mix(in srgb, var(--paper, #fffdf9) 84%, var(--accent, #8f7868) 16%)",
              border:
                "1px solid color-mix(in srgb, var(--border-soft, rgba(0,0,0,0.12)) 68%, var(--accent, #8f7868) 32%)",
              boxShadow: "0 10px 24px rgba(56, 34, 24, 0.08)",
              color: "var(--text-strong, #6a5247)",
              letterSpacing: "0.08em",
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1,
              backdropFilter: "blur(8px)",
            }}
          >
            3×2
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
          gap: 8,
          position: "relative",
          zIndex: 1,
          padding: "14px 14px 18px",
        }}
      >
        <h3
          className="product-card-title"
          style={{
            margin: 0,
            color: "var(--text-strong)",
            fontSize: 12,
            lineHeight: 1.2,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 400,
            display: "block",
            overflow: "visible",
            WebkitLineClamp: "unset",
          }}
        >
          {product.title}
        </h3>

        {displayPrice > 0 ? (
          <div style={{ display: "grid", gap: 8 }}>
            {hasPromotion ? (
              <div style={{ display: "grid", gap: 4 }}>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-muted)",
                    fontSize: 14,
                    lineHeight: 1.1,
                    fontWeight: 700,
                    textDecoration: "line-through",
                    textDecorationThickness: "1px",
                  }}
                >
                  {formatCurrency(basePrice)}
                </p>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-strong)",
                    fontSize: 18,
                    lineHeight: 1.04,
                    letterSpacing: "-0.04em",
                    fontWeight: 800,
                  }}
                >
                  {formatCurrency(displayPrice)}
                </p>
              </div>
            ) : (
              <p
                style={{
                  margin: 0,
                  color: "var(--text-strong)",
                  fontSize: 18,
                  lineHeight: 1.04,
                  letterSpacing: "-0.04em",
                  fontWeight: 800,
                }}
              >
                {formatCurrency(displayPrice)}
              </p>
            )}
            {transferPrice !== null ? (
              <p
                className="product-card-price"
                style={{
                  margin: 0,
                  color: "var(--text-strong)",
                  fontSize: 12,
                  lineHeight: 1.1,
                  fontWeight: 700,
                }}
              >
                {formatCurrency(transferPrice)} con transferencia
              </p>
            ) : null}
            {installmentPrice !== null ? (
              <p
                style={{
                  margin: 0,
                  color: "var(--text-muted)",
                  fontSize: 10,
                  lineHeight: 1.3,
                  fontWeight: 400,
                }}
              >
                3 cuotas sin interes de {formatCurrency(installmentPrice)}
              </p>
            ) : null}
          </div>
        ) : (
          <p
            className="product-card-price"
            style={{ margin: 0, color: "var(--text-muted)" }}
          >
            Consultar precio
          </p>
        )}
      </div>
    </Link>
  );
}
