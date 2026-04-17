"use client";

import { useEffect, useMemo, useState } from "react";
import ProductCard from "@/components/product/ProductCard";
import {
  StoreCategory,
  StoreProduct,
  StoreProductOption,
  StoreVariant,
} from "@/types/store";
import { formatCurrency, roundCurrency } from "@/lib/currency";

type CatalogViewProps = {
  products: StoreProduct[];
  storeOptions: StoreProductOption[];
  storeId?: number;
  initialCategory?: string;
  bankTransferDiscountPercentage?: number;
};

const getPrice = (product: StoreProduct) => {
  const prices = (product.variants ?? [])
    .map((variant) => Number(variant.price ?? 0))
    .filter((price: number) => Number.isFinite(price) && price > 0);

  if (prices.length > 0) {
    return roundCurrency(Math.min(...prices));
  }

  return roundCurrency(product.price ?? 0);
};

const getAvailableStock = (variant: StoreVariant) => {
  const inventories = variant.inventories ?? [];
  return inventories.reduce(
    (total: number, inventory) =>
      total +
      Math.max(
        Number(inventory.quantity ?? 0) - Number(inventory.reserved ?? 0),
        0,
      ),
    0,
  );
};

const hasStock = (product: StoreProduct) =>
  (product.variants ?? []).some((variant) => getAvailableStock(variant) > 0);

const getProductCategories = (product: StoreProduct): StoreCategory[] =>
  (product.categories ?? []).map((entry) => entry.category).filter(Boolean);

const normalizeOptionGroups = (storeOptions: StoreProductOption[]) =>
  storeOptions.map((option) => {
    const groupedValues = new Map<
      string,
      { label: string; productIds: number[]; valueIds: number[] }
    >();

    option.values.forEach((value) => {
      const key = value.value.trim().toLowerCase();
      const existing = groupedValues.get(key);

      if (existing) {
        existing.productIds.push(value.productId);
        existing.valueIds.push(value.id);
        return;
      }

      groupedValues.set(key, {
        label: value.value,
        productIds: [value.productId],
        valueIds: [value.id],
      });
    });

    return {
      id: option.id,
      name: option.name,
      values: [...groupedValues.values()].map((entry) => ({
        ...entry,
        productIds: [...new Set(entry.productIds)],
        valueIds: [...new Set(entry.valueIds)],
      })),
    };
  });

const hiddenCatalogCategorySlugs = new Set(["sale", "gift-cards"]);

export default function CatalogView({
  products,
  storeOptions,
  storeId,
  initialCategory,
  bankTransferDiscountPercentage = 0,
}: CatalogViewProps) {
  const isMiMaria = storeId === 5;
  const priceValues = useMemo(
    () => products.map(getPrice).filter((price) => price > 0),
    [products],
  );
  const minCatalogPrice = priceValues.length > 0 ? Math.min(...priceValues) : 0;
  const maxCatalogPrice = priceValues.length > 0 ? Math.max(...priceValues) : 0;

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();

    products.forEach((product) => {
      getProductCategories(product).forEach((category) => {
        if (hiddenCatalogCategorySlugs.has(category.slug)) {
          return;
        }

        if (!map.has(category.slug)) {
          map.set(category.slug, category.name);
        }
      });
    });

    return [...map.entries()].map(([slug, name]) => ({ slug, name }));
  }, [products]);

  const sizeOptions = useMemo(
    () =>
      [
        ...new Set(
          products.flatMap((product) =>
            (product.variants ?? [])
              .map((variant) => variant.Size)
              .filter(Boolean),
          ),
        ),
      ] as string[],
    [products],
  );

  const dynamicOptions = useMemo(
    () => normalizeOptionGroups(storeOptions),
    [storeOptions],
  );

  const normalizedInitialCategory = initialCategory?.trim().toLowerCase() ?? "";
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    normalizedInitialCategory ? [normalizedInitialCategory] : [],
  );
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedOptionValues, setSelectedOptionValues] = useState<
    Record<number, string[]>
  >({});
  const [priceMin, setPriceMin] = useState(String(minCatalogPrice || ""));
  const [priceMax, setPriceMax] = useState(String(maxCatalogPrice || ""));
  const [onlyStock, setOnlyStock] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc">(
    "featured",
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");

    const syncViewport = () => {
      setIsMobileLayout(mediaQuery.matches);
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  const toggleValue = (
    value: string,
    values: string[],
    setter: (next: string[]) => void,
  ) => {
    setter(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value],
    );
  };

  const toggleDynamicValue = (optionId: number, valueLabel: string) => {
    setSelectedOptionValues((current) => {
      const existing = current[optionId] ?? [];
      const nextValues = existing.includes(valueLabel)
        ? existing.filter((item) => item !== valueLabel)
        : [...existing, valueLabel];

      if (nextValues.length === 0) {
        const clone = { ...current };
        delete clone[optionId];
        return clone;
      }

      return {
        ...current,
        [optionId]: nextValues,
      };
    });
  };

  const filteredProducts = useMemo(() => {
    const visibleProducts = products.filter((product) => {
      const price = getPrice(product);
      const productCategories = getProductCategories(product).map(
        (category) => category.slug,
      );
      const productSizes = (product.variants ?? [])
        .map((variant) => variant.Size)
        .filter(Boolean);
      const available = hasStock(product);

      if (onlyStock && !available) {
        return false;
      }

      if (
        selectedCategories.length > 0 &&
        !selectedCategories.some((category) =>
          productCategories.includes(category),
        )
      ) {
        return false;
      }

      if (
        selectedSizes.length > 0 &&
        !selectedSizes.some((size) => productSizes.includes(size))
      ) {
        return false;
      }

      const min = Number(priceMin || minCatalogPrice || 0);
      const max = Number(priceMax || maxCatalogPrice || 0);

      if (price < min || price > max) {
        return false;
      }

      for (const option of dynamicOptions) {
        const selectedValues = selectedOptionValues[option.id] ?? [];

        if (selectedValues.length === 0) {
          continue;
        }

        const matchesOption = option.values.some(
          (value) =>
            selectedValues.includes(value.label) &&
            value.productIds.includes(product.id),
        );

        if (!matchesOption) {
          return false;
        }
      }

      return true;
    });

    if (sortBy === "price-asc") {
      return [...visibleProducts].sort((a, b) => getPrice(a) - getPrice(b));
    }

    if (sortBy === "price-desc") {
      return [...visibleProducts].sort((a, b) => getPrice(b) - getPrice(a));
    }

    return visibleProducts;
  }, [
    dynamicOptions,
    maxCatalogPrice,
    minCatalogPrice,
    onlyStock,
    priceMax,
    priceMin,
    products,
    selectedCategories,
    selectedOptionValues,
    selectedSizes,
    sortBy,
  ]);

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedSizes([]);
    setSelectedOptionValues({});
    setPriceMin(String(minCatalogPrice || ""));
    setPriceMax(String(maxCatalogPrice || ""));
    setOnlyStock(true);
  };

  const activeFilterCount =
    selectedCategories.length +
    selectedSizes.length +
    Object.values(selectedOptionValues).reduce(
      (total, values) => total + values.length,
      0,
    ) +
    (onlyStock ? 1 : 0) +
    (priceMin !== String(minCatalogPrice || "") ? 1 : 0) +
    (priceMax !== String(maxCatalogPrice || "") ? 1 : 0);

  const desktopCatalogMetrics = filtersOpen
    ? {
        cardWidth: "258px",
        cardHeight: "390px",
        mediaHeight: "264px",
        copyMinHeight: "126px",
        gap: 20,
        columns: "repeat(3, minmax(0, var(--product-card-width)))",
      }
    : {
        cardWidth: "272px",
        cardHeight: "472px",
        mediaHeight: "282px",
        copyMinHeight: "130px",
        gap: 18,
        columns: "repeat(4, minmax(0, var(--product-card-width)))",
      };

  return (
    <section
      style={{
        padding: "72px 20px",
        background: "var(--page-shell-bg)",
        overflowX: "clip",
        ["--product-card-height" as string]: "700px",
        ["--product-card-copy-min-height" as string]: "376px",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "grid",
          gap: 28,
          width: "100%",
          minWidth: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4.8rem)",
              letterSpacing: isMiMaria ? "-0.04em" : "-0.05em",
              marginBottom: 12,
              color: "var(--text-strong)",
            }}
          >
            {isMiMaria ? "Coleccion" : "Catalogo"}
          </h1>
          <p style={{ color: "var(--text-muted)", maxWidth: 680, margin: 0 }}>
            {isMiMaria
              ? "Una seleccion femenina y actual para vestir con naturalidad, elegancia y comodidad todos los dias."
              : "Seleccion completa de prendas urbanas con siluetas relajadas, tonos neutros y basicos listos para la calle."}
          </p>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <div
            style={{
              borderRadius: 24,
              border: "1px solid var(--border-soft)",
              background: "var(--page-panel-bg)",
              padding: "16px 18px",
              display: "grid",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                color: "var(--text-muted)",
                fontSize: 13,
              }}
            >
              <span>Inicio</span>
              <span>/</span>
              <strong style={{ color: "var(--text-strong)" }}>
                {isMiMaria ? "Coleccion" : "Catalogo"}
              </strong>
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => setFiltersOpen((current) => !current)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 999,
                    border: "1px solid var(--border-soft)",
                    background: "transparent",
                    color: "var(--text-strong)",
                    cursor: "pointer",
                  }}
                >
                  Filtros
                  {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </button>

                <p style={{ margin: 0, color: "var(--text-muted)" }}>
                  {filteredProducts.length} producto
                  {filteredProducts.length === 1 ? "" : "s"} encontrados
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <p style={{ margin: 0, color: "var(--text-muted)" }}>
                  Precio entre {formatCurrency(minCatalogPrice)} y{" "}
                  {formatCurrency(maxCatalogPrice)}
                </p>
                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(
                      event.target.value as
                        | "featured"
                        | "price-asc"
                        | "price-desc",
                    )
                  }
                  className="theme-select"
                  aria-label="Ordenar catalogo"
                  style={{ minWidth: 190 }}
                >
                  <option value="featured">
                    {isMiMaria ? "Destacados" : "Recomendados"}
                  </option>
                  <option value="price-asc">Precio: menor a mayor</option>
                  <option value="price-desc">Precio: mayor a menor</option>
                </select>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobileLayout
                ? "minmax(0, 1fr)"
                : filtersOpen
                  ? "minmax(280px, 320px) minmax(0, 1fr)"
                  : "0 minmax(0, 1fr)",
              gridTemplateRows: isMobileLayout
                ? filtersOpen
                  ? "auto minmax(0, 1fr)"
                  : "0 minmax(0, 1fr)"
                : undefined,
              gap: filtersOpen ? (isMobileLayout ? 18 : 28) : 0,
              alignItems: "start",
              transition:
                "grid-template-columns 320ms var(--ease-theme), grid-template-rows 320ms var(--ease-theme), gap 320ms var(--ease-theme)",
            }}
          >
            <aside
              style={{
                minWidth: 0,
                width: isMobileLayout ? "100%" : filtersOpen ? "100%" : 0,
                maxHeight: isMobileLayout ? (filtersOpen ? 2000 : 0) : "none",
                opacity: filtersOpen ? 1 : 0,
                overflow: "hidden",
                pointerEvents: filtersOpen ? "auto" : "none",
                borderRadius: 28,
                border: filtersOpen
                  ? "1px solid var(--border-soft)"
                  : "1px solid transparent",
                background: "var(--page-panel-bg)",
                padding: filtersOpen ? 24 : 0,
                display: "grid",
                gap: 22,
                transition:
                  "width 320ms var(--ease-theme), max-height 320ms var(--ease-theme), opacity 220ms var(--ease-theme), padding 320ms var(--ease-theme), border-color 320ms var(--ease-theme)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <strong style={{ fontSize: 22, color: "var(--text-strong)" }}>
                  Refina tu seleccion
                </strong>

                <button
                  type="button"
                  onClick={clearFilters}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 999,
                    border: "1px solid var(--border-soft)",
                    background: "transparent",
                    color: "var(--text-strong)",
                    cursor: "pointer",
                  }}
                >
                  Limpiar
                </button>
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  color: "var(--text-strong)",
                }}
              >
                <input
                  type="checkbox"
                  checked={onlyStock}
                  onChange={(event) => setOnlyStock(event.target.checked)}
                />
                Solo mostrar productos con stock
              </label>

              <div style={{ display: "grid", gap: 12 }}>
                <p style={filterLabelStyle}>Rango de precio</p>
                <div className="layout-form-two">
                  <input
                    value={priceMin}
                    onChange={(event) => setPriceMin(event.target.value)}
                    placeholder="Min"
                    style={fieldStyle}
                    inputMode="numeric"
                  />
                  <input
                    value={priceMax}
                    onChange={(event) => setPriceMax(event.target.value)}
                    placeholder="Max"
                    style={fieldStyle}
                    inputMode="numeric"
                  />
                </div>
              </div>

              {categoryOptions.length > 0 ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <p style={filterLabelStyle}>Categorias</p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {categoryOptions.map((category) => {
                      const selected = selectedCategories.includes(
                        category.slug,
                      );
                      return (
                        <button
                          key={category.slug}
                          type="button"
                          onClick={() =>
                            toggleValue(
                              category.slug,
                              selectedCategories,
                              setSelectedCategories,
                            )
                          }
                          className="theme-button"
                          style={chipStyle(selected)}
                        >
                          {category.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {sizeOptions.length > 0 ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <p style={filterLabelStyle}>Talles</p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {sizeOptions.map((size) => {
                      const selected = selectedSizes.includes(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() =>
                            toggleValue(size, selectedSizes, setSelectedSizes)
                          }
                          className="theme-button"
                          style={chipStyle(selected)}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {dynamicOptions.map((option) => (
                <div key={option.id} style={{ display: "grid", gap: 12 }}>
                  <p style={filterLabelStyle}>{option.name}</p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {option.values.map((value) => {
                      const selected = (
                        selectedOptionValues[option.id] ?? []
                      ).includes(value.label);

                      return (
                        <button
                          key={`${option.id}-${value.label}`}
                          type="button"
                          onClick={() =>
                            toggleDynamicValue(option.id, value.label)
                          }
                          className="theme-button"
                          style={chipStyle(selected)}
                        >
                          {value.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </aside>

            <div style={{ minWidth: 0, width: "100%", overflowX: "clip" }}>
              {filteredProducts.length === 0 ? (
                <div
                  style={{
                    borderRadius: 28,
                    border: "1px dashed var(--border-soft)",
                    background: "var(--page-panel-bg)",
                    padding: 30,
                    color: "var(--text-muted)",
                    lineHeight: 1.8,
                  }}
                >
                  No encontramos productos con esa combinacion de filtros.
                  Prueba abrir el rango de precio o quitar alguna seleccion.
                </div>
              ) : (
                <div
                  className="layout-product-grid"
                  style={{
                    ["--product-card-width" as string]: isMobileLayout
                      ? undefined
                      : desktopCatalogMetrics.cardWidth,
                    ["--product-card-height" as string]: isMobileLayout
                      ? undefined
                      : desktopCatalogMetrics.cardHeight,
                    ["--product-card-media-height" as string]: isMobileLayout
                      ? undefined
                      : desktopCatalogMetrics.mediaHeight,
                    ["--product-card-copy-min-height" as string]: isMobileLayout
                      ? undefined
                      : desktopCatalogMetrics.copyMinHeight,
                    gridTemplateColumns: isMobileLayout
                      ? "repeat(auto-fit, var(--product-card-width))"
                      : desktopCatalogMetrics.columns,
                    gap: isMobileLayout ? 16 : desktopCatalogMetrics.gap,
                    width: "100%",
                    justifyContent: "center",
                  }}
                >
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      bankTransferDiscountPercentage={
                        bankTransferDiscountPercentage
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "var(--muted-field-bg)",
  color: "var(--muted-field-color)",
  border: "1px solid var(--border-soft)",
  borderRadius: 16,
  outline: "none",
};

const filterLabelStyle: React.CSSProperties = {
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  fontSize: 12,
  color: "var(--text-muted)",
};

const chipStyle = (selected: boolean): React.CSSProperties => ({
  padding: "10px 14px",
  borderRadius: 999,
  border: selected
    ? "1px solid var(--ghost-chip-active-border)"
    : "1px solid var(--ghost-chip-border)",
  background: selected ? "var(--ghost-chip-active-bg)" : "var(--ghost-chip-bg)",
  color: "var(--ghost-chip-color)",
  cursor: "pointer",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: 12,
});
