"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { StoreProduct } from "@/types/store";
import { resolveAssetUrl } from "@/lib/asset-url";
import { formatCurrency } from "@/lib/currency";
import { getCatalogImageTransform } from "@/lib/product-image-layout";
import {
  resolveLabelNormalPrice,
  resolveStorePricingPolicy,
} from "@/lib/pricing-policy";

type Props = {
  products: StoreProduct[];
  storeId?: number;
};

function getProductPrice(product: StoreProduct, storeId?: number) {
  const variantPrice = product.variants?.find((variant) => variant.price != null)?.price;
  const rawPrice = variantPrice ?? product.price;

  if (rawPrice == null || rawPrice === "") {
    return null;
  }

  const numericPrice = Number(rawPrice);

  if (!Number.isFinite(numericPrice)) {
    return null;
  }

  return resolveLabelNormalPrice(
    numericPrice,
    resolveStorePricingPolicy({ storeId }),
  );
}

export default function HeroProductSpotlight({ products, storeId }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (products.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % products.length);
    }, 3800);

    return () => window.clearInterval(interval);
  }, [products.length]);

  if (products.length === 0) {
    return (
      <div
        style={{
          border: "1px dashed var(--border-soft)",
          borderRadius: 26,
          minHeight: 260,
          display: "grid",
          placeItems: "center",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
        }}
      >
        Catalogo en preparacion
      </div>
    );
  }

  const product = products[activeIndex];
  const imageUrl = product.images?.[0]?.url
    ? resolveAssetUrl(product.images[0].url) ?? product.images[0].url
    : null;
  const category = product.categories?.[0]?.category?.name ?? "Selección curada";
  const pricingPolicy = resolveStorePricingPolicy({ storeId });
  const basePrice = resolveLabelNormalPrice(
    product.pricing?.basePrice ?? getProductPrice(product, storeId) ?? 0,
    pricingPolicy,
  );
  const displayPrice = resolveLabelNormalPrice(
    product.pricing?.hasActivePromotion
      ? (product.pricing.finalPrice ?? basePrice)
      : basePrice,
    pricingPolicy,
  );
  const hasPromotion = Boolean(
    product.pricing?.hasActivePromotion && basePrice > displayPrice,
  );

  return (
    <Link
      href={`/product/${product.slug}`}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "grid",
        gap: 16,
      }}
    >
      <div
        style={{
          border: "1px solid var(--border-soft)",
          borderRadius: 26,
          minHeight: 260,
          overflow: "hidden",
          position: "relative",
          backgroundColor: imageUrl ? "#171717" : "#2a2a2a",
          backgroundImage: imageUrl
            ? undefined
            : "linear-gradient(145deg, rgba(41,41,41,0.95) 0%, rgba(172,160,145,0.92) 100%)",
        }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              background: "#ffffff",
              ...getCatalogImageTransform(product.images?.[0]),
            }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(12,12,12,0.02) 0%, rgba(12,12,12,0.14) 42%, rgba(12,12,12,0.72) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 18,
            right: 18,
            bottom: 18,
            display: "grid",
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            {category}
          </span>
          <strong
            style={{
              fontSize: "clamp(1.1rem, 2vw, 1.4rem)",
              lineHeight: 1.05,
              color: "var(--text-strong)",
            }}
          >
            {product.title}
          </strong>
          {displayPrice > 0 ? (
            <span
              style={{
                display: "grid",
                gap: 3,
                color: "var(--text-strong)",
                fontWeight: 700,
              }}
            >
              {hasPromotion ? (
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 13,
                    textDecoration: "line-through",
                    textDecorationThickness: "1px",
                  }}
                >
                  {formatCurrency(basePrice)}
                </span>
              ) : null}
              <span>{formatCurrency(displayPrice)}</span>
            </span>
          ) : (
            <span style={{ color: "var(--text-strong)", fontWeight: 700 }}>
              Consultar precio
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {products.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Ver ${item.title}`}
              onClick={(event) => {
                event.preventDefault();
                setActiveIndex(index);
              }}
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                background:
                  index === activeIndex ? "var(--accent)" : "rgba(255,255,255,0.24)",
                transition: "all 180ms ease",
              }}
            />
          ))}
        </div>

        <span
          style={{
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            fontSize: 11,
          }}
        >
          Ver producto
        </span>
      </div>
    </Link>
  );
}
