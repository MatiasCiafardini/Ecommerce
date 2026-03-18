"use client";

import { useMemo, useState } from "react";
import ProductCard from "@/components/product/ProductCard";

type StoreOption = {
  id: number;
  name: string;
  values: Array<{
    id: number;
    productId: number;
    value: string;
  }>;
};

type CatalogViewProps = {
  products: any[];
  storeOptions: StoreOption[];
};

const getPrice = (product: any) => {
  const prices = (product.variants ?? [])
    .map((variant: any) => Number(variant.price ?? 0))
    .filter((price: number) => Number.isFinite(price) && price > 0);

  if (prices.length > 0) {
    return Math.min(...prices);
  }

  return Number(product.price ?? 0);
};

const getAvailableStock = (variant: any) => {
  const inventories = variant.inventories ?? [];
  return inventories.reduce(
    (total: number, inventory: any) =>
      total + Math.max(Number(inventory.quantity ?? 0) - Number(inventory.reserved ?? 0), 0),
    0,
  );
};

const hasStock = (product: any) =>
  (product.variants ?? []).some((variant: any) => getAvailableStock(variant) > 0);

const getProductCategories = (product: any) =>
  (product.categories ?? []).map((entry: any) => entry.category).filter(Boolean);

const normalizeOptionGroups = (storeOptions: StoreOption[]) =>
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

export default function CatalogView({ products, storeOptions }: CatalogViewProps) {
  const priceValues = useMemo(
    () => products.map(getPrice).filter((price) => price > 0),
    [products],
  );
  const minCatalogPrice = priceValues.length > 0 ? Math.min(...priceValues) : 0;
  const maxCatalogPrice = priceValues.length > 0 ? Math.max(...priceValues) : 0;

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();

    products.forEach((product) => {
      getProductCategories(product).forEach((category: any) => {
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
            (product.variants ?? []).map((variant: any) => variant.Size).filter(Boolean),
          ),
        ),
      ] as string[],
    [products],
  );

  const dynamicOptions = useMemo(() => normalizeOptionGroups(storeOptions), [storeOptions]);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedOptionValues, setSelectedOptionValues] = useState<Record<number, string[]>>({});
  const [priceMin, setPriceMin] = useState(String(minCatalogPrice || ""));
  const [priceMax, setPriceMax] = useState(String(maxCatalogPrice || ""));
  const [onlyStock, setOnlyStock] = useState(true);

  const toggleValue = (
    value: string,
    values: string[],
    setter: (next: string[]) => void,
  ) => {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
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
    return products.filter((product) => {
      const price = getPrice(product);
      const productCategories = getProductCategories(product).map((category: any) => category.slug);
      const productSizes = (product.variants ?? [])
        .map((variant: any) => variant.Size)
        .filter(Boolean);
      const available = hasStock(product);

      if (onlyStock && !available) {
        return false;
      }

      if (
        selectedCategories.length > 0 &&
        !selectedCategories.some((category) => productCategories.includes(category))
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
            selectedValues.includes(value.label) && value.productIds.includes(product.id),
        );

        if (!matchesOption) {
          return false;
        }
      }

      return true;
    });
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
  ]);

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedSizes([]);
    setSelectedOptionValues({});
    setPriceMin(String(minCatalogPrice || ""));
    setPriceMax(String(maxCatalogPrice || ""));
    setOnlyStock(true);
  };

  return (
    <section
      style={{
        padding: "72px 20px",
        background:
          "radial-gradient(circle at top left, rgba(255,255,255,0.06), transparent 28%), linear-gradient(180deg, #141414 0%, #0b0b0b 100%)",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gap: 28 }}>
        <div>
          <h1
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4.8rem)",
              textTransform: "uppercase",
              letterSpacing: "-0.05em",
              marginBottom: 12,
              color: "#ffffff",
            }}
          >
            Catalogo
          </h1>
          <p style={{ color: "rgba(250,244,236,0.76)", maxWidth: 680, margin: 0 }}>
            Seleccion completa de prendas urbanas con siluetas relajadas, tonos
            neutros y basicos listos para la calle.
          </p>
        </div>

        <div
          className="layout-two-col"
          style={{ gridTemplateColumns: "minmax(260px, 0.34fr) minmax(0, 1fr)" }}
        >
          <aside
            style={{
              borderRadius: 30,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
              padding: 24,
              display: "grid",
              gap: 22,
              alignSelf: "start",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <p
                  style={{
                    margin: "0 0 8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                    fontSize: 12,
                    color: "rgba(247,241,232,0.54)",
                  }}
                >
                  Filtros
                </p>
                <strong style={{ fontSize: 24, color: "#fff" }}>
                  Refina tu seleccion
                </strong>
              </div>

              <button
                type="button"
                onClick={clearFilters}
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent",
                  color: "#f7f1e8",
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
                color: "#f7f1e8",
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
                    const selected = selectedCategories.includes(category.slug);
                    return (
                      <button
                        key={category.slug}
                        type="button"
                        onClick={() =>
                          toggleValue(category.slug, selectedCategories, setSelectedCategories)
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
                        onClick={() => toggleValue(size, selectedSizes, setSelectedSizes)}
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
                    const selected = (selectedOptionValues[option.id] ?? []).includes(
                      value.label,
                    );

                    return (
                      <button
                        key={`${option.id}-${value.label}`}
                        type="button"
                        onClick={() => toggleDynamicValue(option.id, value.label)}
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

          <div style={{ display: "grid", gap: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <p style={{ margin: 0, color: "rgba(247,241,232,0.7)" }}>
                {filteredProducts.length} producto{filteredProducts.length === 1 ? "" : "s"} encontrados
              </p>
              <p style={{ margin: 0, color: "rgba(247,241,232,0.5)" }}>
                Precio entre ${minCatalogPrice.toLocaleString("es-AR")} y $
                {maxCatalogPrice.toLocaleString("es-AR")}
              </p>
            </div>

            {filteredProducts.length === 0 ? (
              <div
                style={{
                  borderRadius: 28,
                  border: "1px dashed rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.02)",
                  padding: 30,
                  color: "rgba(247,241,232,0.7)",
                  lineHeight: 1.8,
                }}
              >
                No encontramos productos con esa combinacion de filtros. Prueba abrir el rango de
                precio o quitar alguna seleccion.
              </div>
            ) : (
              <div
                className="layout-product-grid"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 280px))",
                  justifyContent: "start",
                }}
              >
                {filteredProducts.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
  outline: "none",
};

const filterLabelStyle: React.CSSProperties = {
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  fontSize: 12,
  color: "rgba(247,241,232,0.72)",
};

const chipStyle = (selected: boolean): React.CSSProperties => ({
  padding: "10px 14px",
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
  letterSpacing: "0.12em",
  fontSize: 12,
});
