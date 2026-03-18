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

type ProductOption = {
  id: number;
  name: string;
  values: Array<{
    id: number;
    value: string;
    productId: number;
  }>;
};

type Props = {
  product: any;
  productOptions?: ProductOption[];
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

const normalizeProductOptions = (productOptions: ProductOption[] = []) =>
  productOptions.map((option) => ({
    id: option.id,
    name: option.name,
    values: [
      ...new Map(
        option.values.map((value) => [
          value.value.trim().toLowerCase(),
          { id: value.id, value: value.value, productId: value.productId },
        ]),
      ).values(),
    ],
  }));

export default function ProductView({ product, productOptions = [] }: Props) {
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
  const dynamicOptions = useMemo(
    () => normalizeProductOptions(productOptions),
    [productOptions],
  );

  const [selectedSize, setSelectedSize] = useState<string | null>(
    inStockVariants.find((variant) => variant.Size)?.Size ?? sizeOptions[0] ?? null,
  );
  const [selectedColor, setSelectedColor] = useState<string | null>(
    inStockVariants.find((variant) => variant.Color)?.Color ?? colorOptions[0] ?? null,
  );
  const [selectedOptionValues, setSelectedOptionValues] = useState<Record<number, string>>(
    () =>
      Object.fromEntries(
        dynamicOptions
          .filter((option) => option.values.length > 0)
          .map((option) => [option.id, option.values[0].value]),
      ),
  );
  const [showMoreOptions, setShowMoreOptions] = useState(false);

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

  useEffect(() => {
    setSelectedOptionValues(
      Object.fromEntries(
        dynamicOptions
          .filter((option) => option.values.length > 0)
          .map((option) => [option.id, option.values[0].value]),
      ),
    );
  }, [dynamicOptions]);

  const image =
    product.images && product.images.length > 0 ? product.images[0].url : null;

  const currentPrice = Number(
    selectedVariant?.price ??
      inStockVariants[0]?.price ??
      product.variants?.[0]?.price ??
      product.price ??
      0,
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
          gap: 28,
          padding: "72px 20px",
        }}
      >
        <div
          className="layout-two-col"
          style={{
            gridTemplateColumns: "minmax(0, 1fr) minmax(360px, 0.9fr)",
            gap: 36,
            alignItems: "start",
          }}
        >
          <div
            className="theme-hover-lift"
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 36,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
              overflow: "hidden",
              alignSelf: "start",
            }}
          >
            {image ? (
              <img
                src={image}
                alt={product.title}
                style={{
                  width: "100%",
                  aspectRatio: "4 / 5",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  aspectRatio: "4 / 5",
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
              alignSelf: "start",
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
                            style={variantChipStyle(selected, available)}
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
                            style={variantChipStyle(selected, available)}
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
          </div>
        </div>

        <div
          style={{
            borderRadius: 36,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
            padding: "30px",
            display: "grid",
            gap: 18,
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
            <p
              style={{
                margin: 0,
                color: "rgba(250,244,236,0.72)",
                lineHeight: 1.8,
                maxWidth: 920,
              }}
            >
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

          {dynamicOptions.length > 0 ? (
            <div
              style={{
                display: "grid",
                gap: 14,
                paddingTop: 4,
              }}
            >
              <button
                type="button"
                onClick={() => setShowMoreOptions((current) => !current)}
                style={{
                  width: "fit-content",
                  padding: "12px 16px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent",
                  color: "#f7f1e8",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  fontSize: 12,
                }}
              >
                {showMoreOptions ? "Ver menos" : "Ver mas..."}
              </button>

              {showMoreOptions ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 14,
                  }}
                >
                  {dynamicOptions.map((option) => (
                    <div
                      key={option.id}
                      style={{
                        borderRadius: 22,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(8,8,8,0.36)",
                        padding: 18,
                        display: "grid",
                        gap: 12,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          textTransform: "uppercase",
                          letterSpacing: "0.16em",
                          fontSize: 11,
                          color: "rgba(250,244,236,0.74)",
                        }}
                      >
                        {option.name}
                      </p>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {option.values.map((value) => {
                          const selected = selectedOptionValues[option.id] === value.value;

                          return (
                            <button
                              key={value.id}
                              type="button"
                              onClick={() =>
                                setSelectedOptionValues((current) => ({
                                  ...current,
                                  [option.id]: value.value,
                                }))
                              }
                              className="theme-button"
                              style={{
                                padding: "10px 12px",
                                borderRadius: 999,
                                border: selected
                                  ? "1px solid rgba(255,255,255,0.28)"
                                  : "1px solid rgba(255,255,255,0.12)",
                                background: selected
                                  ? "rgba(243,238,231,0.16)"
                                  : "rgba(255,255,255,0.03)",
                                color: "white",
                                cursor: "pointer",
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                                fontSize: 11,
                              }}
                            >
                              {value.value}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

const variantChipStyle = (
  selected: boolean,
  available: boolean,
): React.CSSProperties => ({
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
});
