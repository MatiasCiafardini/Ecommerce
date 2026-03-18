"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/cart-context";

type Variant = {
  id: number;
  price?: number | string | null;
  Size?: string | null;
  Color?: string | null;
  weight?: number | null;
  width?: number | null;
  height?: number | null;
  length?: number | null;
  inventories?: Array<{
    quantity: number;
    reserved: number;
  }>;
};

type Props = {
  product: any;
};

const formatMeasure = (value?: number | string | null, suffix = "cm") => {
  if (value === null || value === undefined || value === "") return "No especificado";
  return `${value} ${suffix}`;
};

const formatVariantTitle = (variant?: Variant | null) => {
  if (!variant) return "Variante principal";
  const parts = [variant.Size, variant.Color].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Variante principal";
};

const getAvailableStock = (variant: Variant) => {
  const inventories = variant.inventories ?? [];
  if (inventories.length === 0) return 0;
  return inventories.reduce(
    (total, inventory) => total + Math.max(inventory.quantity - inventory.reserved, 0),
    0,
  );
};

export default function ProductView({ product }: Props) {
  const { addToCart } = useCart();
  const variants: Variant[] = product.variants ?? [];
  const inStockVariants = useMemo(
    () => variants.filter((variant) => getAvailableStock(variant) > 0),
    [variants],
  );
  const hasVariants = variants.length > 0;

  const sizeOptions = useMemo(
    () => [...new Set(variants.map((variant) => variant.Size).filter(Boolean))] as string[],
    [variants],
  );
  const colorOptions = useMemo(
    () => [...new Set(variants.map((variant) => variant.Color).filter(Boolean))] as string[],
    [variants],
  );

  const [selectedSize, setSelectedSize] = useState<string | null>(
    inStockVariants.find((variant) => variant.Size)?.Size ?? sizeOptions[0] ?? null,
  );
  const [selectedColor, setSelectedColor] = useState<string | null>(
    inStockVariants.find((variant) => variant.Color)?.Color ?? colorOptions[0] ?? null,
  );

  const selectedVariant = useMemo(() => {
    if (!hasVariants) return null;

    return (
      inStockVariants.find((variant) => {
        const matchesSize = selectedSize ? variant.Size === selectedSize : true;
        const matchesColor = selectedColor ? variant.Color === selectedColor : true;
        return matchesSize && matchesColor;
      }) ??
      inStockVariants.find((variant) => (selectedSize ? variant.Size === selectedSize : true)) ??
      inStockVariants.find((variant) => (selectedColor ? variant.Color === selectedColor : true)) ??
      inStockVariants[0] ??
      null
    );
  }, [hasVariants, inStockVariants, selectedColor, selectedSize]);

  const isSizeAvailable = (size: string) =>
    inStockVariants.some((variant) => {
      const matchesSize = variant.Size === size;
      const matchesColor = selectedColor ? variant.Color === selectedColor : true;
      return matchesSize && matchesColor;
    });

  const isColorAvailable = (color: string) =>
    inStockVariants.some((variant) => {
      const matchesColor = variant.Color === color;
      const matchesSize = selectedSize ? variant.Size === selectedSize : true;
      return matchesColor && matchesSize;
    });

  useEffect(() => {
    if (!selectedVariant) return;

    if (selectedVariant.Size && selectedVariant.Size !== selectedSize) {
      setSelectedSize(selectedVariant.Size);
    }

    if (selectedVariant.Color && selectedVariant.Color !== selectedColor) {
      setSelectedColor(selectedVariant.Color);
    }
  }, [selectedColor, selectedSize, selectedVariant]);

  const image =
    product.images && product.images.length > 0 ? product.images[0].url : null;

  const currentPrice = Number(
    selectedVariant?.price ?? inStockVariants[0]?.price ?? product.variants?.[0]?.price ?? product.price ?? 0,
  );

  const hasStock = inStockVariants.length > 0;

  return (
    <section
      style={{
        background:
          "radial-gradient(circle at top left, rgba(255,255,255,0.07), transparent 28%), linear-gradient(180deg, #161616 0%, #0b0b0b 100%)",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "36px",
          padding: "72px 20px",
        }}
      >
        <div
          className="theme-hover-lift"
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 36,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
            minHeight: 560,
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
          }}
        >
          {image ? (
            <img
              src={image}
              alt={product.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                minHeight: 560,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(145deg, #3b3b3b 0%, #aca295 100%)",
                color: "rgba(255,255,255,0.82)",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
              }}
            >
              Product placeholder
            </div>
          )}
        </div>

        <div
          style={{
            borderRadius: 36,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
            padding: "30px",
            display: "grid",
            gap: 22,
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 10px",
                color: "rgba(250,244,236,0.68)",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                fontSize: 12,
              }}
            >
              Asphalt collection
            </p>

            <h1
              style={{
                fontSize: "clamp(2.4rem, 5vw, 4.5rem)",
                lineHeight: 0.95,
                margin: "0 0 14px",
                textTransform: "uppercase",
                letterSpacing: "-0.05em",
                color: "#ffffff",
              }}
            >
              {product.title}
            </h1>

            <p
              style={{
                margin: "0 0 14px",
                color: hasStock ? "rgba(250,244,236,0.78)" : "rgba(255,255,255,0.46)",
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                fontSize: 12,
              }}
            >
              {hasStock
                ? `Variante activa: ${formatVariantTitle(selectedVariant)}`
                : "Sin stock disponible"}
            </p>

            <p
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                margin: 0,
                color: "#f3eee7",
              }}
            >
              ${currentPrice}
            </p>
          </div>

          <p style={{ color: "rgba(250,244,236,0.78)", lineHeight: 1.8, margin: 0 }}>
            {product.description ||
              "Pieza urbana de silueta relajada, disenada para combinar con basicos y capas de uso diario."}
          </p>

          {hasVariants ? (
            <div style={{ display: "grid", gap: 18 }}>
              {sizeOptions.length > 0 ? (
                <div>
                  <p
                    style={{
                      margin: "0 0 12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.16em",
                      fontSize: 12,
                      color: "rgba(250,244,236,0.8)",
                    }}
                  >
                    Selecciona talle
                  </p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {sizeOptions.map((size) => {
                      const available = isSizeAvailable(size);
                      const selected = selectedSize === size;

                      return (
                        <button
                          key={size}
                          type="button"
                          disabled={!available}
                          onClick={() => {
                            if (!available) return;
                            setSelectedSize(size);
                          }}
                          className={available ? "theme-button" : undefined}
                          style={{
                            padding: "12px 14px",
                            borderRadius: 999,
                            border: selected
                              ? "1px solid rgba(255,255,255,0.28)"
                              : "1px solid rgba(255,255,255,0.12)",
                            background: !available
                              ? "rgba(255,255,255,0.02)"
                              : selected
                                ? "rgba(243,238,231,0.16)"
                                : "rgba(255,255,255,0.03)",
                            color: !available ? "rgba(255,255,255,0.32)" : "white",
                            cursor: available ? "pointer" : "not-allowed",
                            textTransform: "uppercase",
                            letterSpacing: "0.12em",
                            fontSize: 12,
                            boxShadow: "none",
                            opacity: available ? 1 : 0.7,
                          }}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {colorOptions.length > 0 ? (
                <div>
                  <p
                    style={{
                      margin: "0 0 12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.16em",
                      fontSize: 12,
                      color: "rgba(250,244,236,0.8)",
                    }}
                  >
                    Selecciona color
                  </p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {colorOptions.map((color) => {
                      const available = isColorAvailable(color);
                      const selected = selectedColor === color;

                      return (
                        <button
                          key={color}
                          type="button"
                          disabled={!available}
                          onClick={() => {
                            if (!available) return;
                            setSelectedColor(color);
                          }}
                          className={available ? "theme-button" : undefined}
                          style={{
                            padding: "12px 14px",
                            borderRadius: 999,
                            border: selected
                              ? "1px solid rgba(255,255,255,0.28)"
                              : "1px solid rgba(255,255,255,0.12)",
                            background: !available
                              ? "rgba(255,255,255,0.02)"
                              : selected
                                ? "rgba(243,238,231,0.16)"
                                : "rgba(255,255,255,0.03)",
                            color: !available ? "rgba(255,255,255,0.32)" : "white",
                            cursor: available ? "pointer" : "not-allowed",
                            textTransform: "uppercase",
                            letterSpacing: "0.12em",
                            fontSize: 12,
                            boxShadow: "none",
                            opacity: available ? 1 : 0.7,
                          }}
                        >
                          {color}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            disabled={!hasStock || !selectedVariant}
            onClick={() => {
              if (!selectedVariant) return;

              addToCart({
                productId: product.id,
                variantId: String(selectedVariant.id),
                name: product.title,
                price: Number(selectedVariant.price || product.price || 0),
                quantity: 1,
                size: selectedVariant.Size ?? undefined,
                color: selectedVariant.Color ?? undefined,
              });
            }}
            className={hasStock ? "theme-button" : undefined}
            style={{
              padding: "16px 24px",
              background: hasStock ? "#f3eee7" : "rgba(255,255,255,0.08)",
              color: hasStock ? "#111" : "rgba(255,255,255,0.4)",
              border: "none",
              borderRadius: 999,
              cursor: hasStock ? "pointer" : "not-allowed",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              fontWeight: 800,
              width: "fit-content",
              boxShadow: "none",
            }}
          >
            {hasStock ? "Agregar al carrito" : "Sin stock"}
          </button>

          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.08)",
              paddingTop: 22,
              display: "grid",
              gap: 16,
            }}
          >
            <div>
              <p
                style={{
                  margin: "0 0 10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  fontSize: 12,
                  color: "rgba(250,244,236,0.74)",
                }}
              >
                Informacion del producto
              </p>
              <p style={{ margin: "0 0 14px", color: "rgba(250,244,236,0.72)", lineHeight: 1.8 }}>
                {product.description ||
                  "Pieza urbana pensada para rotacion diaria, capas faciles y una presencia limpia en cualquier look."}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              {[
                { label: "Weight", value: formatMeasure(selectedVariant?.weight, "kg") },
                { label: "Width", value: formatMeasure(selectedVariant?.width) },
                { label: "Height", value: formatMeasure(selectedVariant?.height) },
                { label: "Length", value: formatMeasure(selectedVariant?.length) },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    borderRadius: 22,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(8,8,8,0.42)",
                    padding: 18,
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.14em",
                      fontSize: 11,
                      color: "rgba(250,244,236,0.54)",
                    }}
                  >
                    {item.label}
                  </span>
                  <strong style={{ color: "#fff", fontSize: 18 }}>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
