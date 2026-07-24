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
import { isGiftCardProduct } from "@/lib/product-kind";
import {
  resolveLabelNormalPrice,
  resolveStorePricingPolicy,
  roundToNearestHundred,
} from "@/lib/pricing-policy";
import ProductCard from "./ProductCard";

type Props = {
  product: StoreProduct;
  productOptions?: StoreProductOption[];
  relatedProducts?: StoreProduct[];
  storeId?: number;
  bankTransferDiscountPercentage?: number;
};

const parseMeasureValue = (value?: number | string | null) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(",", ".");

  if (!normalized) {
    return null;
  }

  const directNumber = Number(normalized);

  if (Number.isFinite(directNumber)) {
    return directNumber;
  }

  const matchedNumber = normalized.match(/-?\d+(?:\.\d+)?/);

  if (!matchedNumber) {
    return null;
  }

  const parsed = Number(matchedNumber[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatMeasure = (value?: number | string | null, suffix = "cm") => {
  const parsedValue = parseMeasureValue(value);

  if (parsedValue === null) {
    return null;
  }

  return `${parsedValue} ${suffix}`;
};

const formatWeightMeasure = ({
  weightGrams,
  weightKg,
}: {
  weightGrams?: number | string | null;
  weightKg?: number | string | null;
}) => {
  const parsedWeightGrams = parseMeasureValue(weightGrams);

  if (parsedWeightGrams !== null) {
    return `${parsedWeightGrams} g`;
  }

  const parsedWeightKg = parseMeasureValue(weightKg);

  if (parsedWeightKg !== null) {
    return `${parsedWeightKg} kg`;
  }

  return null;
};

const compareSizes = (left: string, right: string) =>
  left.localeCompare(right, "es", {
    numeric: true,
    sensitivity: "base",
  });

const isNonEmptyText = (value?: string | null): value is string =>
  Boolean(value);

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
      Math.max(
        basePrice * (1 - Number(pricing.discountPercentage ?? 0) / 100),
        0,
      ),
    );
  }

  if (pricing.promotionType === "fixed_amount") {
    return roundCurrency(
      Math.max(basePrice - Number(pricing.discountAmount ?? 0), 0),
    );
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
  bankTransferDiscountPercentage = 0,
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
  const inStockSizeOptions = useMemo(
    () =>
      [
        ...new Set(
          inStockVariants.map((variant) => variant.Size).filter(isNonEmptyText),
        ),
      ].sort(compareSizes) as string[],
    [inStockVariants],
  );
  const hasVariants = variants.length > 0;

  const sizeOptions = useMemo(
    () =>
      [
        ...new Set(variants.map((variant) => variant.Size).filter(isNonEmptyText)),
      ].sort(compareSizes) as string[],
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
  const informationalOptions = useMemo(
    () =>
      dynamicOptions.filter((option) => {
        const normalizedName = option.name.trim().toLowerCase();
        return !["color", "colour", "talle", "talla", "size"].includes(
          normalizedName,
        );
      }),
    [dynamicOptions],
  );
  const compactCompositionOption = useMemo(() => {
    if (storeId !== 7) return null;

    const matchingOption = informationalOptions.find((option) => {
      const normalizedName = option.name
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return ["textura", "composicion", "composicion y textura"].includes(
        normalizedName,
      );
    });

    return matchingOption && matchingOption.values.length <= 2
      ? matchingOption
      : null;
  }, [informationalOptions, storeId]);
  const visibleInformationalOptions = useMemo(
    () =>
      informationalOptions.filter(
        (option) => option.id !== compactCompositionOption?.id,
      ),
    [compactCompositionOption, informationalOptions],
  );
  const primaryCategoryName = product.categories?.[0]?.category?.name ?? null;
  const isFootwearProduct = product.categories?.some(({ category }) =>
    ["calzado", "zapatilla", "zapatillas"].some((keyword) =>
      category.name.trim().toLowerCase().includes(keyword),
    ),
  );
  const descriptionText =
    product.description ||
    (isMiMaria
      ? "Una prenda femenina pensada para acompanarte todos los dias con una estetica limpia, delicada y actual."
      : "Pieza urbana pensada para rotacion diaria, capas faciles y una presencia limpia en cualquier look.");
  const canCollapseDescription = descriptionText.length > 220;

  const [selectedSize, setSelectedSize] = useState<string | null>(
    inStockSizeOptions[0] ??
      sizeOptions[0] ??
      null,
  );
  const [selectedColor, setSelectedColor] = useState<string | null>(
    inStockVariants.find((variant) => variant.Color)?.Color ??
      colorOptions[0] ??
      null,
  );
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [addStatus, setAddStatus] = useState<"idle" | "loading" | "added">(
    "idle",
  );
  const [cartMessage, setCartMessage] = useState("");
  const [showCartPrompt, setShowCartPrompt] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showGalleryUi, setShowGalleryUi] = useState(false);
  const galleryHideTimeoutRef = useRef<number | null>(null);
  const galleryTouchStartRef = useRef<{ x: number; y: number } | null>(null);

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

  const image = resolveAssetUrl(
    productImages[selectedImageIndex]?.url ?? productImages[0]?.url ?? null,
  );

  const pricingPolicy = resolveStorePricingPolicy({ storeId });
  const currentPrice = resolveLabelNormalPrice(
    selectedVariant?.price ??
      inStockVariants[0]?.price ??
      product.variants?.[0]?.price ??
      product.price ??
      0,
    pricingPolicy,
  );
  const activePricing = selectedVariant?.pricing ?? product.pricing;
  const currentFinalPrice = resolveLabelNormalPrice(
    resolvePromotionalPrice(currentPrice, activePricing),
    pricingPolicy,
  );
  const isGiftCard = isGiftCardProduct(product);
  const transferPrice =
    !isGiftCard && currentFinalPrice > 0 && bankTransferDiscountPercentage > 0
      ? pricingPolicy.transferPriceRounding
        ? roundToNearestHundred(
            Math.max(
              currentFinalPrice * (1 - bankTransferDiscountPercentage / 100),
              0,
            ),
          )
        : roundCurrency(
            Math.max(
              currentFinalPrice * (1 - bankTransferDiscountPercentage / 100),
              0,
            ),
          )
      : null;
  const showInstallments = storeId !== 3 && storeId !== 7;
  const installmentPrice =
    showInstallments && currentFinalPrice > 0
      ? pricingPolicy.labelPriceRounding
        ? roundToNearestHundred(currentFinalPrice / 3)
        : roundCurrency(currentFinalPrice / 3)
      : null;

  const hasStock = inStockVariants.length > 0;
  const selectedVariantStock = selectedVariant
    ? getAvailableStock(selectedVariant)
    : 0;
  const quantityInCart = selectedVariant
    ? (cart.find((item) => item.variantId === String(selectedVariant.id))
        ?.quantity ?? 0)
    : 0;
  const canManageCatalog = ["SUPER_ADMIN", "OWNER", "ADMIN"].includes(user?.role ?? "");
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
  const sizeGuideRows = useMemo(
    () => {
      const rows = variants
        .filter((variant) => Boolean(variant.Size))
        .sort((left, right) =>
          compareSizes(left.Size ?? "", right.Size ?? ""),
        )
        .map((variant) => ({
          id: variant.id,
          size: variant.Size ?? "",
          width: formatMeasure(
            variant.packageWidthCm ?? variant.width ?? product.packageWidthCm,
          ),
          height: formatMeasure(
            variant.packageHeightCm ?? variant.height ?? product.packageHeightCm,
          ),
          length: formatMeasure(
            variant.packageLengthCm ?? variant.length ?? product.packageLengthCm,
          ),
        }));

      if (isFootwearProduct) {
        return rows;
      }

      return [
        ...new Map(rows.map((row) => [row.size.trim().toLowerCase(), row])).values(),
      ];
    },
    [
      isFootwearProduct,
      product.packageHeightCm,
      product.packageLengthCm,
      product.packageWidthCm,
      variants,
    ],
  );
  const hasSizeGuide = sizeGuideRows.some(
    (row) => row.width || row.height || row.length,
  );

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

  const handleGalleryTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    galleryTouchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const handleGalleryTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = galleryTouchStartRef.current;
    const touch = event.changedTouches[0];
    galleryTouchStartRef.current = null;

    if (!start || !touch || productImages.length <= 1) return;

    const horizontalDistance = touch.clientX - start.x;
    const verticalDistance = touch.clientY - start.y;

    if (
      Math.abs(horizontalDistance) < 45 ||
      Math.abs(horizontalDistance) <= Math.abs(verticalDistance)
    ) {
      return;
    }

    if (horizontalDistance < 0) {
      goToNextImage();
    } else {
      goToPreviousImage();
    }
  };

  return (
    <section
      style={{
        background: "var(--page-shell-bg)",
      }}
    >
      <div
        className="product-view-shell"
        style={{
          maxWidth: "var(--theme-layout-max-width, 1280px)",
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
            className="product-gallery-panel"
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
              onTouchStart={handleGalleryTouchStart}
              onTouchEnd={handleGalleryTouchEnd}
              onTouchCancel={() => {
                galleryTouchStartRef.current = null;
              }}
              onFocusCapture={revealGalleryUi}
              onBlurCapture={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null,
                  )
                ) {
                  scheduleGalleryUiHide();
                }
              }}
            >
              {image ? (
                <Image
                  src={image}
                  alt={product.title}
                  fill
                  sizes="(max-width: 900px) 100vw, 56vw"
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    ...getProductImageTransform(
                      productImages[selectedImageIndex] ?? productImages[0],
                    ),
                    background: "#ffffff",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
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
                  <div
                    className="gallery-hover-ui gallery-hover-up"
                    style={galleryCounterStyle}
                  >
                    {selectedImageIndex + 1} / {productImages.length}
                  </div>
                </>
              ) : null}
            </div>

            {productImages.length > 1 ? (
              <div
                className="gallery-thumbnail-dock"
                style={thumbnailDockStyle}
                aria-label="Vistas del producto"
              >
                {productImages.map((productImage, index) => {
                  const isActive = index === selectedImageIndex;

                  return (
                    <button
                      key={`${product.slug}-${productImage.url}-${index}`}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      aria-label={`Ver imagen ${index + 1}`}
                      aria-current={isActive ? "true" : undefined}
                      style={{
                        ...thumbnailButtonStyle(isActive),
                        position: "relative",
                      }}
                    >
                      <Image
                        src={
                          resolveAssetUrl(productImage.url) ??
                          productImage.url
                        }
                        alt={`${product.title} vista ${index + 1}`}
                        fill
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
            ) : null}
          </div>

          <div
            className={`product-detail-column${storeId === 7 ? " is-comovosyyo" : ""}`}
          >
          <div
            className="product-info-panel"
            style={{
              borderRadius: 36,
              border: "1px solid var(--border-soft)",
              background: "var(--page-panel-bg)",
              padding: "30px",
              display: "grid",
              gap: 18,
            }}
          >
            {hasSizeGuide ? (
              <div
                className="product-detail-accordion"
                style={{
                  borderRadius: 22,
                  border: "1px solid var(--border-soft)",
                  background: "var(--block-card-bg)",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowSizeGuide((current) => !current)}
                  aria-expanded={showSizeGuide}
                  style={sizeGuideToggleStyle}
                >
                  <span>Tabla de talles</span>
                  <span aria-hidden="true">{showSizeGuide ? "-" : "+"}</span>
                </button>

                {showSizeGuide ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={sizeGuideTableStyle}>
                      <thead>
                        <tr>
                          <th style={sizeGuideHeaderCellStyle}>Talle</th>
                          <th style={sizeGuideHeaderCellStyle}>Ancho</th>
                          {isFootwearProduct ? (
                            <th style={sizeGuideHeaderCellStyle}>Alto</th>
                          ) : null}
                          <th style={sizeGuideHeaderCellStyle}>Largo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sizeGuideRows.map((row) => (
                          <tr key={row.id}>
                            <td style={sizeGuideCellStyle}>{row.size}</td>
                            <td style={sizeGuideCellStyle}>{row.width ?? "-"}</td>
                            {isFootwearProduct ? (
                              <td style={sizeGuideCellStyle}>
                                {row.height ?? "-"}
                              </td>
                            ) : null}
                            <td style={sizeGuideCellStyle}>{row.length ?? "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : null}

            {storeId === 7 ? (
            <div className="product-detail-accordion">
              <button
                type="button"
                onClick={() => setShowFullDescription((current) => !current)}
                aria-expanded={showFullDescription}
                style={sizeGuideToggleStyle}
              >
                <span>Informacion del producto</span>
                <span aria-hidden="true">{showFullDescription ? "-" : "+"}</span>
              </button>
              {showFullDescription ? (
                <div className="product-detail-accordion__content">
                  <p
                    style={{
                      margin: 0,
                      color: "var(--text-muted)",
                      lineHeight: 1.65,
                    }}
                  >
                    {descriptionText}
                  </p>
                  {compactCompositionOption ? (
                    <div className="product-composition-summary">
                      <strong>Composición y textura</strong>
                      {compactCompositionOption.values.map((value) => (
                        <p key={value.id}>{value.value}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            ) : (
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
                  className={
                    canCollapseDescription && !showFullDescription
                      ? "product-description-text is-collapsed"
                      : "product-description-text"
                  }
                  style={{
                    margin: 0,
                    color: "var(--text-muted)",
                    lineHeight: 1.8,
                  }}
                >
                  {descriptionText}
                </p>
                {canCollapseDescription ? (
                  <button
                    type="button"
                    onClick={() => setShowFullDescription((current) => !current)}
                    style={descriptionToggleStyle}
                  >
                    {showFullDescription ? "Ver menos" : "Ver mas..."}
                  </button>
                ) : null}
              </div>
            )}

            {visibleInformationalOptions.map((option) => {
              const normalizedOptionName = option.name
                .trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
              const optionLabel = [
                "textura",
                "composicion",
                "composicion y textura",
              ].includes(normalizedOptionName)
                ? "Composición y textura"
                : option.name;

              return (
              <details className="product-detail-accordion" key={option.id}>
                <summary>{optionLabel}</summary>
                <div className="product-detail-accordion__content">
                  {option.values.map((value) => (
                    <p key={value.id}>{value.value}</p>
                  ))}
                </div>
              </details>
              );
            })}
          </div>

          <div
            className="product-buy-panel"
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
                {primaryCategoryName ??
                  (isMiMaria ? "Coleccion Mi Maria" : "Coleccion")}
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    minWidth: 0,
                  }}
                >
                  {stockUrgencyMessage ? (
                    <span style={urgencyChipStyle}>{stockUrgencyMessage}</span>
                  ) : null}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <h1
                  className="product-view-title"
                  style={{
                    fontSize:
                      storeId === 7
                        ? product.title.length > 38
                          ? "clamp(1.85rem, 2.8vw, 2.85rem)"
                          : product.title.length > 25
                            ? "clamp(2rem, 3.2vw, 3.25rem)"
                            : "clamp(2.1rem, 3.55vw, 3.65rem)"
                        : "clamp(2.2rem, 4.4vw, 4.5rem)",
                    lineHeight: 0.95,
                    margin: 0,
                    letterSpacing: isMiMaria ? "-0.04em" : "-0.05em",
                    color: "var(--text-strong)",
                    flex: "1 1 auto",
                    minWidth: 0,
                  }}
                >
                  {product.title}
                </h1>
                {canManageCatalog ? (
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

              {!hasStock ? (
                <p
                  style={{
                    margin: "0 0 14px",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.16em",
                    fontSize: 12,
                  }}
                >
                  Sin stock disponible
                </p>
              ) : null}

              <div style={{ display: "grid", gap: 8 }}>
                {activePricing?.hasActivePromotion ? (
                  <>
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
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
                        <span
                          style={{ color: "var(--text-muted)", fontSize: 14 }}
                        >
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
                    fontSize:
                      transferPrice !== null
                        ? "clamp(1.65rem, 3.5vw, 2.7rem)"
                        : "clamp(1.8rem, 3.8vw, 2.95rem)",
                    lineHeight: 0.98,
                    letterSpacing: "-0.04em",
                    fontWeight: 700,
                    margin: 0,
                    color: "var(--text-strong)",
                  }}
                >
                  {formatCurrency(currentFinalPrice)}
                </p>
                {transferPrice !== null ? (
                  <p
                    className="product-transfer-price"
                    style={{
                      margin: 0,
                      color: "var(--text-strong)",
                      fontSize: "clamp(1.12rem, 2.2vw, 1.75rem)",
                      lineHeight: 1.08,
                      letterSpacing: "-0.02em",
                      fontWeight: 500,
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
                      fontSize: 16,
                      lineHeight: 1.5,
                    }}
                  >
                    3 cuotas sin interes de {formatCurrency(installmentPrice)}
                  </p>
                ) : null}
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
                      Seleccioná talle{selectedSize ? ` · ${selectedSize}` : ""}
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
                            className={`product-variant-chip${selected ? " is-selected" : ""}`}
                            aria-pressed={selected}
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
                            className={`product-variant-chip${selected ? " is-selected" : ""}`}
                            aria-pressed={selected}
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
              className={`product-add-to-cart${canAddSelectedVariant ? " theme-button" : ""}`}
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
                  color: "var(--text)",
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
                  color:
                    addStatus === "added"
                      ? "color-mix(in srgb, var(--accent-strong) 84%, var(--text-strong))"
                      : "color-mix(in srgb, var(--accent-strong) 92%, var(--text-strong))",
                  lineHeight: 1.6,
                }}
              >
                {cartMessage}
              </p>
            ) : null}
          </div>
          </div>
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
                {isMiMaria
                  ? "Tambien puede gustarte"
                  : "Productos relacionados"}
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
                gridTemplateColumns:
                  "repeat(auto-fit, var(--product-card-width))",
                justifyContent: "center",
              }}
            >
              {relatedProducts.map((relatedProduct) => (
                <ProductCard
                  key={relatedProduct.id}
                  product={relatedProduct}
                  storeId={storeId}
                  bankTransferDiscountPercentage={
                    bankTransferDiscountPercentage
                  }
                />
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

        .product-gallery-panel {
          grid-column: 1;
          grid-row: 1;
        }

        .product-detail-column {
          display: contents;
        }

        .product-detail-column.is-comovosyyo {
          grid-column: 2;
          grid-row: 1;
          display: flex;
          flex-direction: column-reverse;
          align-self: start;
          position: sticky;
          top: 24px;
          max-height: calc(100vh - 48px);
          overflow-y: auto;
          scrollbar-width: thin;
        }

        .product-detail-column.is-comovosyyo .product-buy-panel,
        .product-detail-column.is-comovosyyo .product-info-panel {
          grid-column: auto;
          grid-row: auto;
        }

        .product-buy-panel {
          grid-column: 2;
          grid-row: 1;
        }

        .product-info-panel {
          grid-column: 1 / -1;
          grid-row: 2;
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
          color: var(--accent-strong) !important;
          backdrop-filter: none !important;
          text-shadow: none !important;
          border-color: transparent !important;
          box-shadow: none !important;
        }

        .gallery-arrow-button:focus-visible {
          outline: none;
          color: var(--accent-strong);
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

        .product-description-text.is-collapsed {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 5;
          overflow: hidden;
        }

        .product-detail-accordion {
          border-top: 1px solid var(--border-soft);
          background: transparent;
        }

        .product-detail-accordion:last-child {
          border-bottom: 1px solid var(--border-soft);
        }

        .product-detail-accordion summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 15px 0;
          color: var(--text-strong);
          cursor: pointer;
          list-style: none;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-size: 13px;
          font-weight: 700;
        }

        .product-detail-accordion summary::-webkit-details-marker {
          display: none;
        }

        .product-detail-accordion summary::after {
          content: "+";
          font-size: 18px;
          font-weight: 400;
        }

        .product-detail-accordion[open] summary::after {
          content: "−";
        }

        .product-detail-accordion__content {
          padding: 2px 0 18px;
          color: var(--text-muted);
          font-size: 15px;
          line-height: 1.65;
        }

        .product-detail-accordion__content p {
          margin: 0;
        }

        .product-detail-accordion__content p + p {
          margin-top: 8px;
        }

        .product-variant-chip {
          background: transparent !important;
          border-color: var(--border-soft) !important;
          color: var(--text-strong) !important;
        }

        .product-variant-chip.is-selected,
        .product-variant-chip.is-selected:hover {
          background: #1a1a1a !important;
          border-color: #1a1a1a !important;
          color: #ffffff !important;
          box-shadow: 0 6px 16px color-mix(in srgb, var(--text-strong) 22%, transparent) !important;
        }

        @media (max-width: 768px) {
          .product-view-shell {
            padding: 34px 10px 52px !important;
            gap: 18px !important;
          }

          .product-gallery-panel {
            order: 1;
            grid-column: auto;
            grid-row: auto;
            padding: 8px !important;
            border-radius: 28px !important;
          }

          .product-detail-column.is-comovosyyo {
            display: flex;
            order: 2;
            grid-column: auto;
            grid-row: auto;
            width: 100%;
            position: static;
            max-height: none;
            overflow: visible;
          }

          .product-gallery-panel .gallery-frame {
            aspect-ratio: 4 / 5 !important;
            border-radius: 24px !important;
            touch-action: pan-y;
          }

          .gallery-arrow-button {
            display: none !important;
          }

          .gallery-thumbnail-dock {
            padding: 10px 2px 2px !important;
            gap: 8px !important;
          }

          .product-buy-panel {
            order: initial;
          }

          .product-info-panel {
            order: initial;
          }

          .product-buy-panel,
          .product-info-panel {
            grid-column: auto;
            grid-row: auto;
            padding: 22px !important;
            border-radius: 28px !important;
          }

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
      ? "#1a1a1a"
      : "transparent",
  color: !available
    ? "var(--text-muted)"
    : selected
      ? "#ffffff"
      : "var(--text-strong)",
  cursor: available ? "pointer" : "not-allowed",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: 12,
  boxShadow: "none",
  opacity: available ? 1 : 0.7,
});

const urgencyChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: 999,
  border:
    "1px solid color-mix(in srgb, var(--accent-strong) 28%, var(--border-soft))",
  background: "color-mix(in srgb, var(--accent) 10%, var(--page-panel-bg))",
  color: "var(--accent-strong)",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const descriptionToggleStyle: React.CSSProperties = {
  width: "fit-content",
  marginTop: 12,
  padding: 0,
  border: "none",
  background: "transparent",
  color: "var(--text-strong)",
  cursor: "pointer",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: 12,
};

const sizeGuideToggleStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "13px 16px",
  border: "none",
  background: "transparent",
  color: "var(--text-strong)",
  cursor: "pointer",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: 12,
  fontWeight: 700,
};

const sizeGuideTableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const sizeGuideHeaderCellStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderTop: "1px solid var(--border-soft)",
  color: "var(--text-muted)",
  textAlign: "left",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: 10,
};

const sizeGuideCellStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderTop: "1px solid var(--border-soft)",
  color: "var(--text-strong)",
  fontSize: 14,
  whiteSpace: "nowrap",
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
  marginTop: 4,
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
  aspectRatio: "1 / 1",
  borderRadius: 28,
  overflow: "hidden",
  border: "1px solid color-mix(in srgb, var(--text-strong) 14%, transparent)",
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
  display: "flex",
  gap: 10,
  padding: "12px 2px 0",
  background: "transparent",
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
  border: "1px solid var(--accent-strong)",
  background: "var(--accent-strong)",
  color: "var(--accent-contrast)",
  cursor: "pointer",
  fontWeight: 700,
  flex: 1,
};

const promptSecondaryStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 999,
  border: "1px solid var(--theme-colors-border-strong, var(--border-strong))",
  background: "color-mix(in srgb, var(--page-panel-bg) 84%, var(--page-panel-strong-bg) 16%)",
  color: "var(--text-strong)",
  cursor: "pointer",
  fontWeight: 600,
  flex: 1,
};

const cartPromptPanelStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  borderRadius: 30,
  border: "1px solid color-mix(in srgb, var(--accent-strong) 34%, var(--border-soft))",
  background:
    "linear-gradient(180deg, var(--page-panel-bg) 0%, color-mix(in srgb, var(--page-panel-bg) 82%, var(--page-panel-strong-bg) 18%) 100%)",
  padding: "28px",
  display: "grid",
  gap: 22,
  boxShadow: "0 24px 80px color-mix(in srgb, var(--text-strong) 28%, transparent)",
};

const cartPromptEyebrowStyle: React.CSSProperties = {
  display: "inline-flex",
  width: "fit-content",
  padding: "8px 12px",
  borderRadius: 999,
  border:
    "1px solid color-mix(in srgb, var(--accent-strong) 46%, var(--border-soft))",
  background: "color-mix(in srgb, var(--accent) 22%, var(--page-panel-bg))",
  color: "var(--accent-strong)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const cartPromptActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
};
