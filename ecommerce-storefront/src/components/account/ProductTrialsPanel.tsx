"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/asset-url";
import { money } from "./order-utils";
import type { TrialSaleItem } from "./AdminManualSalesSection";

type Product = {
  id: number;
  title: string;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  images?: Array<{ url?: string | null }>;
  variants?: Array<{
    id: number;
    sku?: string | null;
    price: string | number;
    Size?: string | null;
    Color?: string | null;
    inventories?: Array<{ quantity?: number; reserved?: number }>;
  }>;
};

type TrialItem = {
  id: number;
  status: "pending" | "returned" | "sold";
  price: string | number;
  resolvedAt?: string | null;
  order?: { id: number; status: string } | null;
  variant: {
    id: number;
    sku?: string | null;
    Size?: string | null;
    Color?: string | null;
    product: { id: number; title: string; images?: Array<{ url?: string | null }> };
  };
};

type Trial = {
  id: number;
  status: string;
  notes?: string | null;
  createdAt: string;
  createdByUser?: { name?: string | null; email: string } | null;
  items: TrialItem[];
};

type DraftLine = {
  variantId: number;
  productId: number;
  title: string;
  variantLabel: string;
  sku: string;
  price: number;
  quantity: number;
  available: number;
};

export default function ProductTrialsPanel({
  accountId,
  onSell,
}: {
  accountId: number;
  onSell: (items: TrialSaleItem[]) => void;
}) {
  const [trials, setTrials] = useState<Trial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [draft, setDraft] = useState<DraftLine[]>([]);
  const [notes, setNotes] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const loadTrials = async () => {
    setLoading(true);
    try {
      const result = await api(`/current-accounts/${accountId}/product-trials`);
      setTrials(Array.isArray(result) ? (result as Trial[]) : []);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar las prendas a prueba."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTrials();
  }, [accountId]);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      setProducts([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setSearching(true);
        const result = await api(`/products?search=${encodeURIComponent(normalized)}&limit=40`, { signal: controller.signal });
        setProducts(Array.isArray(result) ? (result as Product[]) : []);
      } catch (err) {
        if (!controller.signal.aborted) setError(getErrorMessage(err, "No se pudo buscar productos."));
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const pendingItems = useMemo(
    () => trials.flatMap((trial) => trial.items.map((item) => ({ ...item, trial }))).filter((item) => item.status === "pending"),
    [trials],
  );
  const searchResults = useMemo(() => filterProductVariants(products, query), [products, query]);

  const addVariant = (product: Product, variant: NonNullable<Product["variants"]>[number]) => {
    const available = (variant.inventories ?? []).reduce(
      (sum, inventory) => sum + Math.max(Number(inventory.quantity ?? 0) - Number(inventory.reserved ?? 0), 0),
      0,
    );
    if (available <= 0) return;
    setDraft((current) => {
      const existing = current.find((line) => line.variantId === variant.id);
      if (existing) {
        return current.map((line) => line.variantId === variant.id && line.quantity < line.available
          ? { ...line, quantity: line.quantity + 1 }
          : line);
      }
      return [...current, {
        variantId: variant.id,
        productId: product.id,
        title: product.title,
        variantLabel: variantLabel(variant),
        sku: variant.sku ?? "",
        price: Number(variant.price),
        quantity: 1,
        available,
      }];
    });
  };

  const createTrial = async () => {
    if (!draft.length) return;
    try {
      setSaving(true);
      setError("");
      await api(`/current-accounts/${accountId}/product-trials`, {
        method: "POST",
        body: JSON.stringify({
          notes: notes.trim() || undefined,
          items: draft.map((line) => ({ variantId: line.variantId, quantity: line.quantity, price: line.price })),
        }),
      });
      setDraft([]);
      setNotes("");
      setQuery("");
      setProducts([]);
      await loadTrials();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo registrar la entrega."));
    } finally {
      setSaving(false);
    }
  };

  const returnSelected = async () => {
    if (!selectedIds.length) return;
    try {
      setSaving(true);
      setError("");
      await api(`/current-accounts/${accountId}/product-trials/return`, {
        method: "POST",
        body: JSON.stringify({ itemIds: selectedIds }),
      });
      setSelectedIds([]);
      await loadTrials();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron devolver las prendas."));
    } finally {
      setSaving(false);
    }
  };

  const sellSelected = () => {
    const selected = pendingItems.filter((item) => selectedIds.includes(item.id));
    onSell(selected.map((item) => ({
      id: item.id,
      variantId: item.variant.id,
      productId: item.variant.product.id,
      title: item.variant.product.title,
      variantLabel: variantLabel(item.variant),
      sku: item.variant.sku ?? "",
      price: Number(item.price),
      imageUrl: item.variant.product.images?.[0]?.url ?? null,
    })));
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {error ? <p style={{ margin: 0, color: "#b42318" }}>{error}</p> : null}
      <section style={sectionStyle}>
        <div>
          <strong>Nueva entrega</strong>
          <p style={mutedStyle}>Buscá y agregá las prendas que se lleva esta persona.</p>
        </div>
        <label style={searchBoxStyle}>
          <span aria-hidden="true" style={searchIconStyle}>⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, SKU o codigo de barras..."
            style={searchInputStyle}
          />
        </label>
        {searching || query.trim().length >= 2 ? (
          <div style={searchMetaStyle}>
            <span>{searching ? "Buscando..." : `${searchResults.length} variantes`}</span>
          </div>
        ) : null}
        {searchResults.length ? (
          <div style={resultListStyle}>
            {searchResults.map(({ product, variant }) => {
              const available = (variant.inventories ?? []).reduce((sum, inventory) => sum + Math.max(Number(inventory.quantity ?? 0) - Number(inventory.reserved ?? 0), 0), 0);
              const added = draft.some((line) => line.variantId === variant.id);
              const imageUrl = productImage(product);
              return (
                <div
                  key={variant.id}
                  role="button"
                  tabIndex={available > 0 ? 0 : -1}
                  aria-disabled={available <= 0}
                  onDoubleClick={() => addVariant(product, variant)}
                  onKeyDown={(event) => {
                    if ((event.key === "Enter" || event.key === " ") && available > 0) {
                      event.preventDefault();
                      addVariant(product, variant);
                    }
                  }}
                  style={{ ...variantRowStyle, opacity: available > 0 ? 1 : 0.58 }}
                >
                  <span style={productThumbStyle}>
                    {imageUrl ? <img src={imageUrl} alt="" style={thumbImageStyle} /> : product.title.slice(0, 2)}
                  </span>
                  <span style={variantProductStyle}>
                    <strong>{product.title}</strong>
                    <small style={mutedStyle}>{variant.sku || "Sin SKU"}</small>
                  </span>
                  <span style={variantLabelStyle}>Variante: {variantLabel(variant)}</span>
                  <strong>{money(Number(variant.price))}</strong>
                  <span style={available > 0 ? stockStyle : emptyStockStyle}>
                    {available > 0 ? "Disponible" : "Sin stock"}
                  </span>
                  <button
                    type="button"
                    disabled={available <= 0}
                    onClick={() => addVariant(product, variant)}
                    style={added ? addedButtonStyle : addButtonStyle}
                  >
                    {added ? "Sumar" : "Agregar"}
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
        {draft.map((line) => (
          <div key={line.variantId} style={lineStyle}>
            <span><strong>{line.title}</strong><small style={mutedStyle}>{line.variantLabel}</small></span>
            <input aria-label={`Cantidad de ${line.title}`} type="number" min={1} max={line.available} value={line.quantity} onChange={(event) => setDraft((current) => current.map((entry) => entry.variantId === line.variantId ? { ...entry, quantity: Math.min(Math.max(Number(event.target.value), 1), entry.available) } : entry))} style={numberInputStyle} />
            <strong>{money(line.price * line.quantity)}</strong>
            <button type="button" aria-label={`Quitar ${line.title}`} onClick={() => setDraft((current) => current.filter((entry) => entry.variantId !== line.variantId))} style={iconButtonStyle}>×</button>
          </div>
        ))}
        {draft.length ? (
          <>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observaciones (opcional)" style={{ ...inputStyle, minHeight: 68, resize: "vertical" }} />
            <button type="button" onClick={() => void createTrial()} disabled={saving} style={primaryButtonStyle}>{saving ? "Guardando..." : "Confirmar entrega"}</button>
          </>
        ) : null}
      </section>

      <section style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div><strong>Prendas pendientes</strong><p style={mutedStyle}>{pendingItems.length} fuera del local</p></div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" disabled={!selectedIds.length || saving} onClick={() => void returnSelected()} style={secondaryButtonStyle}>Devolver</button>
            <button type="button" disabled={!selectedIds.length || saving} onClick={sellSelected} style={primaryButtonStyle}>Vender seleccionadas</button>
          </div>
        </div>
        {loading ? <p style={mutedStyle}>Cargando...</p> : pendingItems.length === 0 ? <p style={mutedStyle}>No hay prendas pendientes.</p> : pendingItems.map((item) => (
          <label key={item.id} style={lineStyle}>
            <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => setSelectedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} />
            <span><strong>{item.variant.product.title}</strong><small style={mutedStyle}>{variantLabel(item.variant)} · Entrega #{item.trial.id} · hace {daysSince(item.trial.createdAt)} días</small></span>
            <strong>{money(Number(item.price))}</strong>
          </label>
        ))}
      </section>

      <section style={sectionStyle}>
        <strong>Historial</strong>
        {trials.flatMap((trial) => trial.items.map((item) => ({ trial, item }))).map(({ trial, item }) => (
          <div key={item.id} style={lineStyle}>
            <span><strong>{item.variant.product.title}</strong><small style={mutedStyle}>{variantLabel(item.variant)} · {new Date(trial.createdAt).toLocaleDateString("es-AR")}</small></span>
            <span style={{ fontWeight: 700 }}>{statusLabel(item)}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

function variantLabel(variant: { Size?: string | null; Color?: string | null }) {
  return [variant.Size, variant.Color].filter(Boolean).join(" / ") || "Variante unica";
}

function daysSince(value: string) {
  return Math.max(Math.floor((Date.now() - new Date(value).getTime()) / 86400000), 0);
}

function statusLabel(item: TrialItem) {
  if (item.status === "returned") return "Devuelta";
  if (item.status === "sold" && item.order?.status === "cancelled") {
    return `Venta anulada #${item.order.id}`;
  }
  if (item.status === "sold") return item.order ? `Vendida #${item.order.id}` : "Vendida";
  return "Pendiente";
}

function productImage(product: Product) {
  const raw = product.thumbnailUrl || product.imageUrl || product.images?.[0]?.url || "";
  return raw ? resolveAssetUrl(raw) ?? raw : "";
}

function filterProductVariants(products: Product[], query: string) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return [];

  const rows = products.flatMap((product) =>
    (product.variants ?? []).map((variant) => ({ product, variant })),
  );
  const exactSkuMatches = rows.filter(
    ({ variant }) => normalizeSearchValue(variant.sku ?? "") === normalizedQuery,
  );
  if (exactSkuMatches.length) return exactSkuMatches;

  const terms = normalizedQuery.split(/\s+/u).filter(Boolean);
  return rows.filter(({ product, variant }) => {
    const searchable = normalizeSearchValue(
      [product.title, variant.sku, variant.Size, variant.Color].filter(Boolean).join(" "),
    );
    return terms.every((term) => searchable.includes(term));
  });
}

function normalizeSearchValue(value: string) {
  return value
    .replace(/[\u0027\u0060\u2019\u2018\u00b4\u02bc\u02b9\u2032\uff07]/g, "-")
    .trim()
    .toLowerCase();
}

const sectionStyle: React.CSSProperties = { display: "grid", gap: 12, padding: 16, border: "1px solid #e4e7ec", borderRadius: 8, background: "#fff" };
const mutedStyle: React.CSSProperties = { display: "block", margin: "3px 0 0", color: "#667085", fontSize: 13 };
const inputStyle: React.CSSProperties = { width: "100%", border: "1px solid #d0d5dd", borderRadius: 6, padding: "10px 12px", font: "inherit" };
const numberInputStyle: React.CSSProperties = { width: 64, border: "1px solid #d0d5dd", borderRadius: 6, padding: 8 };
const lineStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "auto minmax(180px, 1fr) auto auto", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: "1px solid #eaecf0" };
const primaryButtonStyle: React.CSSProperties = { border: 0, borderRadius: 6, padding: "10px 14px", background: "#1570ef", color: "#fff", fontWeight: 700, cursor: "pointer" };
const secondaryButtonStyle: React.CSSProperties = { border: "1px solid #d0d5dd", borderRadius: 6, padding: "9px 13px", background: "#fff", color: "#344054", fontWeight: 700, cursor: "pointer" };
const iconButtonStyle: React.CSSProperties = { border: 0, background: "transparent", fontSize: 22, cursor: "pointer", width: 32, height: 32 };
const searchBoxStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "0 14px", border: "1px solid #d0d5dd", borderRadius: 8, background: "#fff" };
const searchIconStyle: React.CSSProperties = { color: "#667085", fontSize: 22, lineHeight: 1 };
const searchInputStyle: React.CSSProperties = { flex: 1, minWidth: 0, border: 0, outline: 0, padding: "12px 0", background: "transparent", font: "inherit" };
const searchMetaStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", color: "#667085", fontSize: 13 };
const resultListStyle: React.CSSProperties = { display: "grid", gap: 10, maxHeight: 340, overflow: "auto", paddingRight: 4 };
const variantRowStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "58px minmax(150px, 1.3fr) minmax(105px, .8fr) minmax(105px, .65fr) minmax(90px, .55fr) auto", gap: 12, alignItems: "center", minWidth: 720, padding: 12, border: "1px solid #e4e7ec", borderRadius: 8, background: "#fff" };
const productThumbStyle: React.CSSProperties = { display: "grid", placeItems: "center", width: 58, height: 58, overflow: "hidden", borderRadius: 8, background: "#f2f4f7", color: "#175cd3", fontWeight: 800, textTransform: "uppercase" };
const thumbImageStyle: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
const variantProductStyle: React.CSSProperties = { display: "grid", gap: 5, minWidth: 0 };
const variantLabelStyle: React.CSSProperties = { color: "#667085", fontSize: 13, fontWeight: 700 };
const stockStyle: React.CSSProperties = { color: "#027a48", fontSize: 13, fontWeight: 700 };
const emptyStockStyle: React.CSSProperties = { ...stockStyle, color: "#b42318" };
const addButtonStyle: React.CSSProperties = { border: "1px solid #b2ddff", borderRadius: 6, padding: "8px 11px", background: "#eff8ff", color: "#175cd3", fontWeight: 700, cursor: "pointer" };
const addedButtonStyle: React.CSSProperties = { ...addButtonStyle, borderColor: "#abefc6", background: "#ecfdf3", color: "#067647" };
