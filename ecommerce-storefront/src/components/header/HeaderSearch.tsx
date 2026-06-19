"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/asset-url";
import { formatCurrency } from "@/lib/currency";
import {
  resolveLabelNormalPrice,
  resolveStorePricingPolicy,
} from "@/lib/pricing-policy";
import { getClientStoreId } from "@/lib/tenant/store-context";
import type { StoreCategory, StoreProduct } from "@/types/store";

type HeaderSearchProps = {
  compact?: boolean;
};

type SearchTab = "products" | "collections";

export default function HeaderSearch({ compact = false }: HeaderSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.get("search") ?? "";
  const [value, setValue] = useState(currentSearch);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchTab>("products");
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const drawerRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const inputId = useId();
  const trimmedSearch = value.trim();
  const shouldRenderDrawer = open || closing;

  const closeSearch = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }

    setOpen(false);
    setClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setClosing(false);
      closeTimerRef.current = null;
    }, 460);
  }, []);

  const openSearch = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setValue("");
    setProducts([]);
    setLoadedOnce(false);
    setLoading(false);
    setActiveTab("products");
    setClosing(false);
    setOpen(true);
  };

  useEffect(() => {
    setValue(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    try {
      setStoreId(getClientStoreId());
    } catch {
      setStoreId(null);
    }
  }, []);

  useEffect(() => {
    if (!shouldRenderDrawer) {
      return;
    }

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      if (!open) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (!drawerRef.current?.contains(target)) {
        closeSearch();
      }
    };

    const previousOverflow = document.body.style.overflow;
    const previousOverflowX = document.body.style.overflowX;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlOverflowX = document.documentElement.style.overflowX;
    document.body.style.overflow = "hidden";
    document.body.style.overflowX = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overflowX = "hidden";
    document.addEventListener("pointerdown", closeOnOutsidePointerDown);

    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 180);
    }

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.overflowX = previousOverflowX;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overflowX = previousHtmlOverflowX;
    };
  }, [closeSearch, open, shouldRenderDrawer]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!trimmedSearch) {
      setProducts([]);
      setLoading(false);
      setLoadedOnce(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const query = `?search=${encodeURIComponent(trimmedSearch)}`;

      setLoading(true);
      api(`/store/products${query}`)
        .then((response) => {
          if (cancelled) {
            return;
          }

          setProducts(Array.isArray(response) ? (response as StoreProduct[]) : []);
          setLoadedOnce(true);
        })
        .catch(() => {
          if (!cancelled) {
            setProducts([]);
            setLoadedOnce(true);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, trimmedSearch]);

  const collections = useMemo(() => {
    const map = new Map<string, StoreCategory>();
    const normalizedSearch = trimmedSearch.toLowerCase();

    products.forEach((product) => {
      (product.categories ?? []).forEach(({ category }) => {
        if (!category || map.has(category.slug)) {
          return;
        }

        if (
          !normalizedSearch ||
          category.name.toLowerCase().includes(normalizedSearch) ||
          category.slug.toLowerCase().includes(normalizedSearch)
        ) {
          map.set(category.slug, category);
        }
      });
    });

    return [...map.values()];
  }, [products, trimmedSearch]);

  const navigateToCatalog = () => {
    if (!trimmedSearch) {
      router.push("/product");
      closeSearch();
      return;
    }

    const params =
      pathname === "/product"
        ? new URLSearchParams(searchParams.toString())
        : new URLSearchParams();
    params.set("search", trimmedSearch);

    router.push(`/product?${params.toString()}`);
    closeSearch();
  };

  const submitSearch = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    navigateToCatalog();
  };

  return (
    <>
      <button
        type="button"
        aria-label="Abrir buscador"
        aria-expanded={open}
        onClick={openSearch}
        style={searchButtonStyle}
      >
        <SearchIcon />
      </button>

      {shouldRenderDrawer ? (
        <div
          style={getOverlayStyle(compact)}
          data-state={closing ? "closing" : "open"}
          onClick={closeSearch}
          role="presentation"
        >
          <aside
            ref={drawerRef}
            className="header-search-drawer"
            data-compact={compact ? "true" : "false"}
            data-state={closing ? "closing" : "open"}
            style={getDrawerStyle(compact)}
            onClick={(event) => event.stopPropagation()}
          >
            <form role="search" onSubmit={submitSearch} style={getFormStyle(compact)}>
              <label htmlFor={inputId} style={srOnlyStyle}>
                Buscar productos
              </label>
              <SearchIcon />
              <input
                ref={inputRef}
                id={inputId}
                name="storefront-product-search"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Buscar productos..."
                style={inputStyle}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="search"
              />
              <button
                type="button"
                aria-label="Cerrar buscador"
                onClick={closeSearch}
                style={closeButtonStyle}
              >
                <CloseIcon />
              </button>
            </form>

            <div style={getTabsStyle(compact)}>
              <button
                type="button"
                className="header-search-tab"
                onClick={() => setActiveTab("products")}
                data-active={activeTab === "products" ? "true" : "false"}
                style={tabStyle(activeTab === "products")}
              >
                Productos
              </button>
              <button
                type="button"
                className="header-search-tab"
                onClick={() => setActiveTab("collections")}
                data-active={activeTab === "collections" ? "true" : "false"}
                style={tabStyle(activeTab === "collections")}
              >
                Colecciones
              </button>
            </div>

            <div style={getResultsStyle(compact)}>
              {activeTab === "products" ? (
                <ProductResults
                  products={products}
                  loading={loading}
                  loadedOnce={loadedOnce}
                  storeId={storeId}
                  onClose={closeSearch}
                />
              ) : (
                <CollectionResults
                  collections={collections}
                  loading={loading}
                  loadedOnce={loadedOnce}
                  onClose={closeSearch}
                />
              )}
            </div>

            <div style={getFooterStyle(compact)}>
              <button type="button" onClick={navigateToCatalog} style={allResultsStyle}>
                {trimmedSearch ? "Ver todos los resultados" : "Ver catalogo"}
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <style jsx>{`
        @keyframes headerSearchSlideIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes headerSearchSlideOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        @keyframes headerSearchOverlayIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes headerSearchOverlayOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        @keyframes headerSearchCompactIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes headerSearchCompactOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-10px);
          }
        }

        [data-state="closing"] {
          pointer-events: none;
        }

        div[data-state="open"] {
          animation: headerSearchOverlayIn 220ms ease-out both;
        }

        div[data-state="closing"] {
          animation: headerSearchOverlayOut 280ms ease-out both;
        }

        .header-search-drawer[data-state="open"] {
          animation: headerSearchSlideIn 460ms cubic-bezier(0.22, 1, 0.36, 1)
            both;
        }

        .header-search-drawer[data-state="closing"] {
          animation: headerSearchSlideOut 360ms cubic-bezier(0.4, 0, 0.2, 1)
            both;
        }

        .header-search-drawer[data-compact="true"][data-state="open"] {
          animation: headerSearchCompactIn 260ms cubic-bezier(0.22, 1, 0.36, 1)
            both;
        }

        .header-search-drawer[data-compact="true"][data-state="closing"] {
          animation: headerSearchCompactOut 220ms cubic-bezier(0.4, 0, 0.2, 1)
            both;
        }

        .header-search-tab:hover,
        .header-search-tab:focus-visible {
          background: color-mix(
            in srgb,
            var(--text-strong, #111) 8%,
            transparent
          ) !important;
          color: var(--text-strong, #111) !important;
          border-color: transparent !important;
          box-shadow: none !important;
          outline: none;
        }

        .header-search-tab[data-active="true"]:hover,
        .header-search-tab[data-active="true"]:focus-visible {
          border-bottom-color: var(--text-strong, #111) !important;
        }

        .header-search-drawer {
          max-height: 100dvh;
          overflow: hidden;
        }

        .header-search-drawer[data-compact="true"] {
          max-height: calc(100dvh - 24px);
        }

        @media (max-width: 920px) {
          .header-search-drawer {
            width: min(480px, calc(100vw - 24px)) !important;
            height: min(680px, calc(100dvh - 24px)) !important;
            border-radius: 18px;
          }
        }

        @media (max-width: 640px) {
          .header-search-drawer {
            width: calc(100vw - 24px) !important;
          }
        }
      `}</style>
    </>
  );
}

function ProductResults({
  products,
  loading,
  loadedOnce,
  storeId,
  onClose,
}: {
  products: StoreProduct[];
  loading: boolean;
  loadedOnce: boolean;
  storeId?: number | null;
  onClose: () => void;
}) {
  if (loading && !loadedOnce) {
    return <EmptyState text="Buscando productos..." />;
  }

  if (!loading && loadedOnce && products.length === 0) {
    return <EmptyState text="No encontramos productos con esa busqueda." />;
  }

  return (
    <div style={listStyle}>
      {products.slice(0, 8).map((product) => (
        <Link
          key={product.id}
          href={`/product/${product.slug}`}
          onClick={onClose}
          style={productResultStyle}
        >
          <ProductThumb product={product} />
          <div style={{ display: "grid", gap: 9, minWidth: 0 }}>
            <p style={productTitleStyle}>{product.title}</p>
            <ProductPrice product={product} storeId={storeId} />
          </div>
        </Link>
      ))}
    </div>
  );
}

function CollectionResults({
  collections,
  loading,
  loadedOnce,
  onClose,
}: {
  collections: StoreCategory[];
  loading: boolean;
  loadedOnce: boolean;
  onClose: () => void;
}) {
  if (loading && !loadedOnce) {
    return <EmptyState text="Buscando colecciones..." />;
  }

  if (!loading && loadedOnce && collections.length === 0) {
    return <EmptyState text="No encontramos colecciones relacionadas." />;
  }

  return (
    <div style={listStyle}>
      {collections.map((category) => (
        <Link
          key={category.id}
          href={`/category/${category.slug}`}
          onClick={onClose}
          style={collectionResultStyle}
        >
          <span style={collectionMarkerStyle} />
          <span>{category.name}</span>
        </Link>
      ))}
    </div>
  );
}

function ProductThumb({ product }: { product: StoreProduct }) {
  const imageUrl = resolveAssetUrl(product.images?.[0]?.url ?? null);

  if (!imageUrl) {
    return <div style={thumbFallbackStyle}>Producto</div>;
  }

  return (
    <div style={thumbStyle}>
      <Image
        src={imageUrl}
        alt={product.title}
        fill
        unoptimized
        sizes="96px"
        style={{ objectFit: "cover", objectPosition: "center" }}
      />
    </div>
  );
}

function ProductPrice({ product, storeId }: { product: StoreProduct; storeId?: number | null }) {
  const fallbackPrice = Number(product.variants?.[0]?.price ?? product.price ?? 0);
  const hasPromotion = Boolean(product.pricing?.hasActivePromotion);
  const pricingPolicy = resolveStorePricingPolicy({ storeId });
  const displayPrice = hasPromotion
    ? resolveLabelNormalPrice(product.pricing?.finalPrice ?? fallbackPrice, pricingPolicy)
    : resolveLabelNormalPrice(fallbackPrice, pricingPolicy);
  const basePrice = hasPromotion
    ? resolveLabelNormalPrice(product.pricing?.basePrice ?? fallbackPrice, pricingPolicy)
    : resolveLabelNormalPrice(fallbackPrice, pricingPolicy);

  if (!displayPrice) {
    return <span style={mutedPriceStyle}>Consultar precio</span>;
  }

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <span style={hasPromotion ? salePriceStyle : priceStyle}>
        {formatCurrency(displayPrice)}
      </span>
      {hasPromotion ? (
        <span style={oldPriceStyle}>{formatCurrency(basePrice)}</span>
      ) : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p style={emptyStyle}>{text}</p>;
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "0 0 auto" }}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

const srOnlyStyle = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

const searchButtonStyle: React.CSSProperties = {
  color: "var(--header-action-color, var(--theme-colors-text-strong, currentColor))",
  textDecoration: "none",
  width: 44,
  height: 44,
  borderRadius: 999,
  border: "1px solid var(--header-action-border, rgba(255,255,255,0.12))",
  background: "var(--header-action-bg, rgba(255,255,255,0.04))",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 80,
  background: "rgba(0,0,0,0.28)",
  display: "flex",
  justifyContent: "flex-end",
};

const compactOverlayStyle: React.CSSProperties = {
  ...overlayStyle,
  alignItems: "flex-start",
  justifyContent: "center",
  padding: 12,
  boxSizing: "border-box",
  overflow: "hidden",
};

const drawerStyle: React.CSSProperties = {
  width: "min(460px, 92vw)",
  height: "100dvh",
  background: "var(--page-panel-bg, #fff)",
  color: "var(--text-strong, #111)",
  boxShadow: "-28px 0 70px rgba(0,0,0,0.22)",
  display: "grid",
  gridTemplateRows: "auto auto minmax(0, 1fr) auto",
  transform: "translateX(0)",
};

const compactDrawerStyle: React.CSSProperties = {
  ...drawerStyle,
  width: "min(480px, calc(100vw - 24px))",
  height: "min(680px, calc(100dvh - 24px))",
  maxHeight: "calc(100dvh - 24px)",
  borderRadius: 18,
  boxShadow: "0 22px 70px rgba(0,0,0,0.2)",
};

const formStyle: React.CSSProperties = {
  height: 98,
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "0 26px",
  borderBottom: "1px solid var(--border-soft, rgba(0,0,0,0.12))",
  color: "var(--text-muted, #666)",
};

const compactFormStyle: React.CSSProperties = {
  ...formStyle,
  height: 72,
  padding: "0 18px",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: "none",
  outline: "none",
  background: "transparent",
  color: "var(--text-strong, #111)",
  font: "inherit",
  fontSize: 15,
};

const closeButtonStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  border: "none",
  background: "transparent",
  color: "var(--text-muted, #777)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
};

const tabsStyle: React.CSSProperties = {
  display: "flex",
  gap: 38,
  padding: "26px 40px 18px",
};

const compactTabsStyle: React.CSSProperties = {
  ...tabsStyle,
  gap: 24,
  padding: "18px 24px 12px",
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: "9px 13px 10px",
  margin: "-9px -13px 0",
  border: "none",
  borderBottom: active
    ? "2px solid var(--text-strong, #111)"
    : "2px solid transparent",
  background: "transparent",
  borderRadius: 4,
  color: active ? "var(--text-strong, #111)" : "var(--text-muted, #777)",
  cursor: "pointer",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: 12,
  fontWeight: 700,
});

const resultsStyle: React.CSSProperties = {
  minHeight: 0,
  overflowY: "auto",
  padding: "8px 40px 24px",
};

const compactResultsStyle: React.CSSProperties = {
  ...resultsStyle,
  padding: "8px 24px 18px",
};

const listStyle: React.CSSProperties = {
  display: "grid",
  gap: 24,
};

const productResultStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "92px minmax(0, 1fr)",
  gap: 24,
  alignItems: "center",
  color: "inherit",
  textDecoration: "none",
};

const collectionResultStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  minHeight: 48,
  color: "var(--text-strong, #111)",
  textDecoration: "none",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontSize: 13,
};

const collectionMarkerStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 999,
  background: "var(--accent, #111)",
};

const thumbStyle: React.CSSProperties = {
  position: "relative",
  width: 92,
  height: 138,
  overflow: "hidden",
  borderRadius: 4,
  background: "#f3f3f3",
};

const thumbFallbackStyle: React.CSSProperties = {
  ...thumbStyle,
  display: "grid",
  placeItems: "center",
  color: "var(--text-muted, #777)",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
};

const productTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--text-strong, #111)",
  fontSize: 14,
  lineHeight: 1.35,
};

const priceStyle: React.CSSProperties = {
  color: "var(--text-strong, #111)",
  fontSize: 13,
};

const salePriceStyle: React.CSSProperties = {
  ...priceStyle,
  color: "var(--accent-strong, #d42121)",
};

const oldPriceStyle: React.CSSProperties = {
  color: "var(--text-muted, #777)",
  fontSize: 13,
  textDecoration: "line-through",
};

const mutedPriceStyle: React.CSSProperties = {
  color: "var(--text-muted, #777)",
  fontSize: 13,
};

const emptyStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--text-muted, #777)",
  lineHeight: 1.7,
};

const footerStyle: React.CSSProperties = {
  padding: "18px 40px max(52px, calc(36px + env(safe-area-inset-bottom)))",
  background:
    "linear-gradient(180deg, transparent, var(--page-panel-bg, #fff) 18%)",
};

const compactFooterStyle: React.CSSProperties = {
  ...footerStyle,
  padding: "14px 24px max(18px, calc(14px + env(safe-area-inset-bottom)))",
};

const allResultsStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 52,
  borderRadius: 999,
  border: "none",
  background: "var(--text-strong, #000)",
  color: "var(--page-panel-bg, #fff)",
  cursor: "pointer",
  textTransform: "uppercase",
  letterSpacing: "0.22em",
  fontSize: 12,
  fontWeight: 800,
};

function getOverlayStyle(compact: boolean): React.CSSProperties {
  return compact ? compactOverlayStyle : overlayStyle;
}

function getDrawerStyle(compact: boolean): React.CSSProperties {
  return compact ? compactDrawerStyle : drawerStyle;
}

function getFormStyle(compact: boolean): React.CSSProperties {
  return compact ? compactFormStyle : formStyle;
}

function getTabsStyle(compact: boolean): React.CSSProperties {
  return compact ? compactTabsStyle : tabsStyle;
}

function getResultsStyle(compact: boolean): React.CSSProperties {
  return compact ? compactResultsStyle : resultsStyle;
}

function getFooterStyle(compact: boolean): React.CSSProperties {
  return compact ? compactFooterStyle : footerStyle;
}
