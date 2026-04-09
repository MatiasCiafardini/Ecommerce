"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { StoreProduct, StoreProductOption, StoreVariant } from "@/types/store";
import { resolveAssetUrl } from "@/lib/asset-url";
import { formatCurrency, roundCurrency } from "@/lib/currency";
import { getProductImageTransform } from "@/lib/product-image-layout";
import ProductCard from "./ProductCard";

type Props = {
  product: StoreProduct;
  productOptions?: StoreProductOption[];
  relatedProducts?: StoreProduct[];
  storeId?: number;
};

const getDefaultOptionValues = (options: StoreProductOption[]) =>
  Object.fromEntries(
    options
      .filter((option) => option.values.length > 0)
      .map((option) => [option.id, option.values[0].value]),
  );

const formatMeasure = (value?: number | string | null, suffix = "cm") => {
  if (value === null || value === undefined || value === "")
    return "No especificado";
  return `${value} ${suffix}`;
};

const formatVariantTitle = (variant?: StoreVariant | null) => {
  if (!variant) return "Variante principal";
  const parts = [variant.Size, variant.Color].filter(Boolean);
  return parts.length > 0 ? parts.join(" - ") : "Variante principal";
};

const getAvailableStock = (variant: StoreVariant) => {
  const inventories = variant.inventories ?? [];
  if (inventories.length === 0) return 0;
  return inventories.reduce(
    (total, inventory) =>
      total + Math.max(inventory.quantity - inventory.reserved, 0),
    0,
  );
};

const resolvePromotionalPrice = (
  basePrice: number,
  pricing?: StoreProduct["pricing"],
) => {
  if (!pricing?.hasActivePromotion) {
    return roundCurrency(basePrice);
  }

  if (pricing.promotionType === "percentage") {
    return roundCurrency(
      Math.max(basePrice * (1 - Number(pricing.discountPercentage ?? 0) / 100), 0),
    );
  }

  if (pricing.promotionType === "fixed_amount") {
    return roundCurrency(Math.max(basePrice - Number(pricing.discountAmount ?? 0), 0));
  }

  return roundCurrency(basePrice);
};

const normalizeProductOptions = (productOptions: StoreProductOption[] = []) =>
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

export default function ProductView({
  product,
  productOptions = [],
  relatedProducts = [],
  storeId,
}: Props) {
  const isMiMaria = storeId === 5;
  const { user } = useAuth();
  const { addToCart, cart } = useCart();
  const router = useRouter();
  const productImages = useMemo(() => product.images ?? [], [product.images]);
  const variants = useMemo<StoreVariant[]>(
    () => product.variants ?? [],
    [product.variants],
  );
  const inStockVariants = useMemo(
    () => variants.filter((variant) => getAvailableStock(variant) > 0),
    [variants],
  );
  const hasVariants = variants.length > 0;

  const sizeOptions = useMemo(
    () =>
      [
        ...new Set(variants.map((variant) => variant.Size).filter(Boolean)),
      ] as string[],
    [variants],
  );
  const colorOptions = useMemo(
    () =>
      [
        ...new Set(variants.map((variant) => variant.Color).filter(Boolean)),
      ] as string[],
    [variants],
  );
  const dynamicOptions = useMemo(
    () => normalizeProductOptions(productOptions),
    [productOptions],
  );
  const primaryCategoryName = product.categories?.[0]?.category?.name ?? null;

  const [selectedSize, setSelectedSize] = useState<string | null>(
    inStockVariants.find((variant) => variant.Size)?.Size ??
      sizeOptions[0] ??
      null,
  );
  const [selectedColor, setSelectedColor] = useState<string | null>(
    inStockVariants.find((variant) => variant.Color)?.Color ??
      colorOptions[0] ??
      null,
  );
  const [selectedOptionValues, setSelectedOptionValues] = useState<
    Record<number, string>
  >(() => getDefaultOptionValues(dynamicOptions));
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [addStatus, setAddStatus] = useState<"idle" | "loading" | "added">(
    "idle",
  );
  const [cartMessage, setCartMessage] = useState("");
  const [showCartPrompt, setShowCartPrompt] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showGalleryUi, setShowGalleryUi] = useState(false);
  const galleryHideTimeoutRef = useRef<number | null>(null);

  const revealGalleryUi = () => {
    if (galleryHideTimeoutRef.current) {
      window.clearTimeout(galleryHideTimeoutRef.current);
      galleryHideTimeoutRef.current = null;
    }
    setShowGalleryUi(true);
  };

  const scheduleGalleryUiHide = () => {
    if (galleryHideTimeoutRef.current) {
      window.clearTimeout(galleryHideTimeoutRef.current);
    }
    galleryHideTimeoutRef.current = window.setTimeout(() => {
      setShowGalleryUi(false);
      galleryHideTimeoutRef.current = null;
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (galleryHideTimeoutRef.current) {
        window.clearTimeout(galleryHideTimeoutRef.current);
      }
    };
  }, []);

  const selectedVariant = useMemo(() => {
    if (!hasVariants) return null;

    return (
      inStockVariants.find((variant) => {
        const matchesSize = selectedSize ? variant.Size === selectedSize : true;
        const matchesColor = selectedColor
          ? variant.Color === selectedColor
          : true;
        return matchesSize && matchesColor;
      }) ??
      inStockVariants.find((variant) =>
        selectedSize ? variant.Size === selectedSize : true,
      ) ??
      inStockVariants.find((variant) =>
        selectedColor ? variant.Color === selectedColor : true,
      ) ??
      inStockVariants[0] ??
      null
    );
  }, [hasVariants, inStockVariants, selectedColor, selectedSize]);

  const isSizeAvailable = (size: string) =>
    inStockVariants.some((variant) => variant.Size === size);

  const isColorAvailable = (color: string) =>
    inStockVariants.some((variant) => variant.Color === color);

  const findFirstVariantForSize = (size: string) =>
    inStockVariants.find((variant) => variant.Size === size) ?? null;

  const findFirstVariantForColor = (color: string) =>
    inStockVariants.find((variant) => variant.Color === color) ?? null;

  const image =
    resolveAssetUrl(
      productImages[selectedImageIndex]?.url ?? productImages[0]?.url ?? null,
    );

  const currentPrice = roundCurrency(
    selectedVariant?.price ??
      inStockVariants[0]?.price ??
      product.variants?.[0]?.price ??
      product.price ??
      0,
  );
  const activePricing = selectedVariant?.pricing ?? product.pricing;
  const currentFinalPrice = resolvePromotionalPrice(currentPrice, activePricing);

  const hasStock = inStockVariants.length > 0;
  const selectedVariantStock = selectedVariant
    ? getAvailableStock(selectedVariant)
    : 0;
  const quantityInCart = selectedVariant
    ? (cart.find((item) => item.variantId === String(selectedVariant.id))
        ?.quantity ?? 0)
    : 0;
  const isAdmin = Boolean(user?.role && user.role !== "CUSTOMER");
  const canAddSelectedVariant = Boolean(
    selectedVariant &&
    selectedVariantStock > 0 &&
    quantityInCart < selectedVariantStock,
  );
  const remainingUnits = Math.max(selectedVariantStock - quantityInCart, 0);
  const stockUrgencyMessage =
    remainingUnits > 0 && remainingUnits < 10
      ? "Ultimas unidades disponibles"
      : null;
  const stockSupportMessage =
    quantityInCart > 0 && remainingUnits > 0
      ? stockUrgencyMessage
        ? "Ya tenes esta variante en el carrito y quedan muy pocas unidades."
        : "Ya tenes esta variante en el carrito."
      : quantityInCart > 0 && remainingUnits === 0
        ? "Ya agregaste las ultimas unidades disponibles de esta variante."
        : null;

  const handleAddToCart = async () => {
    if (!selectedVariant) return;

    setCartMessage("");
    setAddStatus("loading");

    await new Promise((resolve) => window.setTimeout(resolve, 450));

    const result = addToCart(
      {
        productId: String(product.id),
        variantId: String(selectedVariant.id),
        slug: product.slug,
        imageUrl: image,
        name: product.title,
        price: currentFinalPrice,
        quantity: 1,
        maxAvailable: selectedVariantStock,
        size: selectedVariant.Size ?? undefined,
        color: selectedVariant.Color ?? undefined,
      },
      1,
    );

    if (!result.ok) {
      setAddStatus("idle");
      setCartMessage(result.reason ?? "No se pudo agregar el producto.");
      return;
    }

    setAddStatus("added");
    setCartMessage(
      result.maxAvailable === result.quantity
        ? "Agregaste la ultima unidad disponible de esta variante."
        : "Producto agregado al carrito.",
    );
    setShowCartPrompt(true);
    window.setTimeout(() => setAddStatus("idle"), 2400);
  };

  const goToPreviousImage = () => {
    if (productImages.length <= 1) return;
    setSelectedImageIndex((current) =>
      current === 0 ? productImages.length - 1 : current - 1,
    );
  };

  const goToNextImage = () => {
    if (productImages.length <= 1) return;
    setSelectedImageIndex((current) =>
      current === productImages.length - 1 ? 0 : current + 1,
    );
  };

  return (
    <section
      style={{
        background: "var(--page-shell-bg)",
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
            style={{
              border: "1px solid var(--border-soft)",
              borderRadius: 36,
              background: "var(--page-panel-bg)",
              overflow: "hidden",
              alignSelf: "start",
              padding: 16,
            }}
          >
            <div
              className={`gallery-frame${showGalleryUi ? " is-gallery-ui-visible" : ""}`}
              style={galleryFrameStyle}
              onMouseEnter={revealGalleryUi}
              onMouseLeave={scheduleGalleryUiHide}
              onFocusCapture={revealGalleryUi}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  scheduleGalleryUiHide();
                }
              }}
            >
              {image ? (
                <Image
                  src={image}
                  alt={product.title}
                  fill
                  unoptimized
                  sizes="(max-width: 900px) 100vw, 56vw"
                  style={{
                    width: "100%",
                    aspectRatio: "4 / 5",
                    display: "block",
                    ...getProductImageTransform(productImages[selectedImageIndex] ?? productImages[0]),
                    background: "#ffffff",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "4 / 5",
                    display: "grid",
                    placeItems: "center",
                    background: "var(--product-media-fallback)",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                  }}
                >
                  Product placeholder
                </div>
              )}

              {productImages.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={goToPreviousImage}
                    aria-label="Ver imagen anterior"
                    className="gallery-arrow-button gallery-hover-ui gallery-hover-side"
                    style={galleryArrowStyle("left")}
                  >
                    <span style={galleryArrowIconStyle}>
                      <svg
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                        style={galleryArrowSvgStyle}
                      >
                        <path
                          d="M11.5 4.5 6 10l5.5 5.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={goToNextImage}
                    aria-label="Ver imagen siguiente"
                    className="gallery-arrow-button gallery-hover-ui gallery-hover-side"
                    style={galleryArrowStyle("right")}
                  >
                    <span style={galleryArrowIconStyle}>
                      <svg
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                        style={galleryArrowSvgStyle}
                      >
                        <path
                          d="M8.5 4.5 14 10l-5.5 5.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                  <div className="gallery-hover-ui gallery-hover-up" style={galleryCounterStyle}>
                    {selectedImageIndex + 1} / {productImages.length}
                  </div>

                  <div className="gallery-hover-ui gallery-hover-up" style={thumbnailDockStyle}>
                    {productImages.map((productImage, index) => {
                      const isActive = index === selectedImageIndex;

                      return (
                        <button
                          key={`${product.slug}-${productImage.url}-${index}`}
                          type="button"
                          onClick={() => setSelectedImageIndex(index)}
                          aria-label={`Ver imagen ${index + 1}`}
                          style={{ ...thumbnailButtonStyle(isActive), position: "relative" }}
                        >
                          <Image
                            src={resolveAssetUrl(productImage.url) ?? productImage.url}
                            alt={`${product.title} vista ${index + 1}`}
                            fill
                            unoptimized
                            sizes="88px"
                            style={{
                              ...thumbnailImageStyle,
                              ...getProductImageTransform(productImage),
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div
            style={{
              borderRadius: 36,
              border: "1px solid var(--border-soft)",
              background: "var(--page-panel-bg)",
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
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  fontSize: 12,
                }}
              >
                {primaryCategoryName ?? (isMiMaria ? "Coleccion Mi Maria" : "Coleccion")}
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", minWidth: 0 }}>
                  <span style={slugChipStyle}>/{product.slug}</span>
                  {stockUrgencyMessage ? (
                    <span style={urgencyChipStyle}>{stockUrgencyMessage}</span>
                  ) : null}
                </div>
                {isAdmin ? (
                  <Link
                    href={`/account?section=admin-products&productId=${product.id}`}
                    style={adminEditButtonStyle}
                    aria-label="Editar producto"
                    title="Editar producto"
                  >
                    <EditIcon />
                  </Link>
                ) : null}
              </div>

              <h1
                style={{
                  fontSize: "clamp(2.4rem, 5vw, 4.5rem)",
                  lineHeight: 0.95,
                  margin: "0 0 14px",
                  letterSpacing: isMiMaria ? "-0.04em" : "-0.05em",
                  color: "var(--text-strong)",
                }}
              >
                {product.title}
              </h1>

              <p
                style={{
                  margin: "0 0 14px",
                  color: hasStock
                    ? "var(--text-muted)"
                    : "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  fontSize: 12,
                }}
              >
                {hasStock
                  ? `Variante activa: ${formatVariantTitle(selectedVariant)}`
                  : "Sin stock disponible"}
              </p>

              <div style={{ display: "grid", gap: 8 }}>
                {activePricing?.hasActivePromotion ? (
                  <>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <span
                        style={{
                          padding: "7px 10px",
                          borderRadius: 999,
                          background: "var(--accent)",
                          color: "var(--accent-contrast, #fff)",
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                        }}
                      >
                        -{activePricing.discountPercentage}%
                      </span>
                      {activePricing.promotionLabel ? (
                        <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
                          {activePricing.promotionLabel}
                        </span>
                      ) : null}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        color: "var(--text-muted)",
                        textDecoration: "line-through",
                      }}
                    >
                      {formatCurrency(currentPrice)}
                    </p>
                  </>
                ) : null}
                <p
                  style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    margin: 0,
                    color: "var(--text-strong)",
                  }}
                >
                  {formatCurrency(currentFinalPrice)}
                </p>
              </div>
              {selectedVariant && remainingUnits === 0 ? (
                <p
                  style={{
                    margin: "12px 0 0",
                    color: "var(--text-muted)",
                    lineHeight: 1.6,
                  }}
                >
                  No hay mas stock disponible para esta variante.
                </p>
              ) : null}
            </div>

            <p
              style={{
                color: "var(--text-muted)",
                lineHeight: 1.8,
                margin: 0,
              }}
            >
              {product.description ||
                (isMiMaria
                  ? "Una prenda versatil de lineas suaves, pensada para vestir con elegancia, comodidad y naturalidad."
                  : "Pieza urbana de silueta relajada, disenada para combinar con basicos y capas de uso diario.")}
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
                        color: "var(--text-muted)",
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

                              const matchingVariant = inStockVariants.find(
                                (variant) =>
                                  variant.Size === size &&
                                  (selectedColor
                                    ? variant.Color === selectedColor
                                    : true),
                              );

                              if (!matchingVariant) {
                                const fallbackVariant =
                                  findFirstVariantForSize(size);
                                if (fallbackVariant?.Color) {
                                  setSelectedColor(fallbackVariant.Color);
                                }
                              }
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
                        color: "var(--text-muted)",
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

                              const matchingVariant = inStockVariants.find(
                                (variant) =>
                                  variant.Color === color &&
                                  (selectedSize
                                    ? variant.Size === selectedSize
                                    : true),
                              );

                              if (!matchingVariant) {
                                const fallbackVariant =
                                  findFirstVariantForColor(color);
                                if (fallbackVariant?.Size) {
                                  setSelectedSize(fallbackVariant.Size);
                                }
                              }
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
              disabled={
                !hasStock ||
                !selectedVariant ||
                !canAddSelectedVariant ||
                addStatus === "loading"
              }
              onClick={() => void handleAddToCart()}
              className={canAddSelectedVariant ? "theme-button" : undefined}
              style={{
                padding: "16px 24px",
                background: canAddSelectedVariant
                  ? "var(--text-strong)"
                  : "var(--block-card-bg)",
                color: canAddSelectedVariant
                  ? "var(--page-panel-bg)"
                  : "var(--text-muted)",
                border: "none",
                borderRadius: 999,
                cursor: canAddSelectedVariant ? "pointer" : "not-allowed",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                fontWeight: 800,
                width: "fit-content",
                boxShadow: "none",
              }}
            >
              {!hasStock
                ? "Sin stock"
                : addStatus === "loading"
                  ? "Agregando..."
                  : addStatus === "added"
                    ? "Producto agregado"
                    : canAddSelectedVariant
                      ? "Agregar al carrito"
                      : "Stock maximo en carrito"}
            </button>

            {stockSupportMessage ? (
              <p
                style={{
                  margin: "-8px 0 0",
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                }}
              >
                {stockSupportMessage}
              </p>
            ) : null}

            {cartMessage ? (
              <p
                style={{
                  margin: addStatus === "added" ? "-8px 0 0" : "0",
                  color: addStatus === "added" ? "#b8f5c2" : "#ffb4b4",
                  lineHeight: 1.6,
                }}
              >
                {cartMessage}
              </p>
            ) : null}
          </div>
        </div>

        <div
          style={{
            borderRadius: 36,
            border: "1px solid var(--border-soft)",
            background: "var(--page-panel-bg)",
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
                color: "var(--text-muted)",
              }}
            >
              Informacion del producto
            </p>
            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                lineHeight: 1.8,
                maxWidth: 920,
              }}
            >
              {product.description ||
                (isMiMaria
                  ? "Una prenda femenina pensada para acompanarte todos los dias con una estetica limpia, delicada y actual."
                  : "Pieza urbana pensada para rotacion diaria, capas faciles y una presencia limpia en cualquier look.")}
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
              {
                label: "Peso",
                value: formatMeasure(selectedVariant?.weight, "kg"),
              },
              { label: "Ancho", value: formatMeasure(selectedVariant?.width) },
              {
                label: "Alto",
                value: formatMeasure(selectedVariant?.height),
              },
              {
                label: "Largo",
                value: formatMeasure(selectedVariant?.length),
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  borderRadius: 22,
                  border: "1px solid var(--border-soft)",
                  background: "var(--block-card-bg)",
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
                    color: "var(--text-muted)",
                  }}
                >
                  {item.label}
                </span>
                <strong style={{ color: "var(--text-strong)", fontSize: 18 }}>
                  {item.value}
                </strong>
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
                  border: "1px solid var(--border-soft)",
                  background: "transparent",
                  color: "var(--text-strong)",
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
                        border: "1px solid var(--border-soft)",
                        background: "var(--block-card-bg)",
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
                          color: "var(--text-muted)",
                        }}
                      >
                        {option.name}
                      </p>
                      <div
                        style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                      >
                        {option.values.map((value) => {
                          const selected =
                            selectedOptionValues[option.id] === value.value;

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
                                  ? "1px solid var(--text-strong)"
                                  : "1px solid var(--border-soft)",
                                background: selected
                                  ? "var(--block-card-bg)"
                                  : "transparent",
                                color: "var(--text-strong)",
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

        {relatedProducts.length > 0 ? (
          <div
            style={{
              borderRadius: 36,
              border: "1px solid var(--border-soft)",
              background: "var(--page-panel-bg)",
              padding: "30px",
              display: "grid",
              gap: 20,
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <span
                style={{
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                {isMiMaria ? "Tambien puede gustarte" : "Productos relacionados"}
              </span>
              <h2
                style={{
                  margin: 0,
                  fontSize: "clamp(1.8rem, 3vw, 3rem)",
                  color: "var(--text-strong)",
                }}
              >
                {isMiMaria
                  ? "Segui descubriendo la coleccion"
                  : "Mas piezas para completar el look"}
              </h2>
            </div>

            <div
              className="layout-product-grid"
              style={{
                gridTemplateColumns: "repeat(auto-fit, var(--product-card-width))",
                justifyContent: "center",
              }}
            >
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {showCartPrompt ? (
        <div
          style={cartPromptOverlayStyle}
          onClick={() => setShowCartPrompt(false)}
          role="presentation"
        >
          <div
            className="cart-prompt-panel"
            style={cartPromptPanelStyle}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Producto agregado al carrito"
          >
            <div style={{ display: "grid", gap: 8 }}>
              <span style={cartPromptEyebrowStyle}>Producto agregado</span>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-strong)",
                  fontSize: 28,
                  lineHeight: 1.1,
                }}
              >
                Queres ir al carrito o seguir descubriendo la coleccion?
              </p>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-muted)",
                  lineHeight: 1.7,
                }}
              >
                El producto ya quedo guardado en tu carrito. Podes seguir viendo
                la tienda o avanzar al checkout cuando quieras.
              </p>
            </div>

            <div className="cart-prompt-actions" style={cartPromptActionsStyle}>
              <button
                type="button"
                onClick={() => router.push("/cart")}
                style={promptPrimaryStyle}
              >
                Ir al carrito
              </button>
              <button
                type="button"
                onClick={() => setShowCartPrompt(false)}
                style={promptSecondaryStyle}
              >
                Seguir comprando
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .cart-prompt-panel {
          align-self: center;
        }

        .cart-prompt-actions {
          flex-direction: row;
        }

        .gallery-hover-ui {
          opacity: 0;
          pointer-events: none;
          transition:
            opacity 260ms cubic-bezier(0.22, 1, 0.36, 1),
            transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
          will-change: opacity, transform;
        }

        .gallery-hover-up {
          transform: translate3d(0, 18px, 0);
        }

        .gallery-hover-side {
          transform: translate3d(0, -50%, 0) scale(0.96);
        }

        .gallery-frame.is-gallery-ui-visible .gallery-hover-ui {
          opacity: 1;
          pointer-events: auto;
        }

        .gallery-frame.is-gallery-ui-visible .gallery-hover-up {
          transform: translate3d(0, 0, 0);
        }

        .gallery-frame.is-gallery-ui-visible .gallery-hover-side {
          transform: translate3d(0, -50%, 0) scale(1);
        }

        .gallery-arrow-button:hover {
          background: transparent !important;
          color: #ffe4bf !important;
          backdrop-filter: none !important;
          text-shadow: none !important;
          border-color: transparent !important;
          box-shadow: none !important;
        }

        .gallery-arrow-button:focus-visible {
          outline: none;
          color: #ffe4bf;
          text-shadow: none;
          background: transparent;
          border-color: transparent;
          box-shadow: none;
        }

        .gallery-arrow-button,
        .gallery-arrow-button:active,
        .gallery-arrow-button:focus,
        .gallery-arrow-button:focus-visible {
          appearance: none;
          -webkit-appearance: none;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }

        @media (max-width: 768px) {
          .cart-prompt-panel {
            align-self: flex-end;
            max-width: 100%;
            border-radius: 28px 28px 0 0;
            padding: 24px 20px 28px;
          }

          .cart-prompt-actions {
            flex-direction: column;
          }

          .gallery-hover-ui {
            opacity: 1;
            pointer-events: auto;
          }

          .gallery-hover-up {
            transform: none;
          }

          .gallery-hover-side {
            transform: translate3d(0, -50%, 0) scale(1);
          }
        }
      `}</style>
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
    ? "1px solid var(--text-strong)"
    : "1px solid var(--border-soft)",
  background: !available
    ? "transparent"
    : selected
      ? "var(--block-card-bg)"
      : "transparent",
  color: !available ? "var(--text-muted)" : "var(--text-strong)",
  cursor: available ? "pointer" : "not-allowed",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: 12,
  boxShadow: "none",
  opacity: available ? 1 : 0.7,
});

const slugChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid var(--border-soft)",
  background: "var(--block-card-bg)",
  color: "var(--text-muted)",
  fontSize: 12,
  letterSpacing: "0.08em",
};

const urgencyChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,193,122,0.24)",
  background: "rgba(255,193,122,0.12)",
  color: "#ffe4bf",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L7 21l-4 1 1-4L16.5 3.5Z" />
    </svg>
  );
}

const adminEditButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
  width: 40,
  height: 40,
  padding: 0,
  borderRadius: 999,
  border: "1px solid var(--border-soft)",
  background: "var(--block-card-bg)",
  color: "var(--text-strong)",
  textDecoration: "none",
  boxSizing: "border-box",
};

const galleryFrameStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "4 / 5",
  minHeight: "clamp(420px, 62vw, 760px)",
  borderRadius: 28,
  overflow: "hidden",
  border: "1px solid var(--border-soft)",
  background: "#ffffff",
  boxShadow: "inset 0 -80px 120px rgba(0,0,0,0.04)",
};

const galleryArrowStyle = (side: "left" | "right"): React.CSSProperties => ({
  position: "absolute",
  top: "50%",
  [side]: 22,
  transform: "translateY(-50%)",
  padding: 0,
  border: "none",
  background: "transparent",
  color: "var(--text-strong)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  fontSize: 34,
  fontWeight: 700,
  lineHeight: 1,
  textShadow: "0 8px 24px rgba(0,0,0,0.45)",
});

const galleryArrowIconStyle: React.CSSProperties = {
  display: "inline-flex",
  width: 34,
  height: 34,
  alignItems: "center",
  justifyContent: "center",
};

const galleryArrowSvgStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "block",
};

const galleryCounterStyle: React.CSSProperties = {
  position: "absolute",
  left: 16,
  top: 16,
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid var(--border-soft)",
  background: "color-mix(in srgb, var(--page-panel-bg) 82%, transparent)",
  color: "var(--text-strong)",
  fontSize: 12,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  backdropFilter: "blur(12px)",
};

const thumbnailDockStyle: React.CSSProperties = {
  position: "absolute",
  left: 16,
  right: 16,
  bottom: 16,
  display: "flex",
  gap: 10,
  padding: 10,
  borderRadius: 24,
  background: "color-mix(in srgb, var(--page-panel-bg) 88%, transparent)",
  backdropFilter: "blur(8px)",
  overflowX: "auto",
  scrollbarWidth: "none",
};

const thumbnailButtonStyle = (isActive: boolean): React.CSSProperties => ({
  padding: 0,
  position: "relative",
  width: 76,
  height: 92,
  borderRadius: 16,
  overflow: "hidden",
  border: isActive
    ? "1px solid var(--text-strong)"
    : "1px solid var(--border-soft)",
  background: "#ffffff",
  cursor: "pointer",
  boxShadow: "none",
  flex: "0 0 76px",
  opacity: isActive ? 1 : 0.72,
});

const thumbnailImageStyle: React.CSSProperties = {
  width: "100%",
  objectFit: "cover",
  objectPosition: "center center",
  display: "block",
  background: "#ffffff",
};

const cartPromptOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 60,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 18,
  background: "rgba(0,0,0,0.58)",
};

const promptPrimaryStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 999,
  border: "none",
  background: "#f3eee7",
  color: "#111",
  cursor: "pointer",
  fontWeight: 700,
  flex: 1,
};

const promptSecondaryStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 999,
  border: "1px solid var(--border-soft)",
  background: "transparent",
  color: "var(--text-strong)",
  cursor: "pointer",
  flex: 1,
};

const cartPromptPanelStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  borderRadius: 30,
  border: "1px solid var(--border-soft)",
  background: "var(--page-panel-bg)",
  padding: "28px",
  display: "grid",
  gap: 22,
  boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
};

const cartPromptEyebrowStyle: React.CSSProperties = {
  display: "inline-flex",
  width: "fit-content",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,193,122,0.24)",
  background: "rgba(255,193,122,0.12)",
  color: "#ffe4bf",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const cartPromptActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
};
