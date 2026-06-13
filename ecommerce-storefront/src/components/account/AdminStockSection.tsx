"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { api } from "@/lib/api";
import { resolveManualSaleUnitPrice, resolveStorePricingPolicy } from "@/lib/pricing-policy";
import { getPublicApiUrl } from "@/lib/runtime-config";
import { getClientStoreId } from "@/lib/tenant/store-context";
import { money } from "./order-utils";

type VariantRow = {
  id: number;
  productId: number;
  productName: string;
  variantName: string;
  sku: string;
  stock: number;
  price: number;
  imageUrl: string | null;
  active: boolean;
  categories: { id: number; name: string }[];
};

type Category = { id: number; name: string };
type SortKey = "product" | "variant" | "sku" | "stock" | "price" | "active";
type SortDirection = "asc" | "desc";

type Filters = {
  search: string;
  sku: string;
  name: string;
  categoryId: string;
  activeOnly: boolean;
  withoutStockOnly: boolean;
};

const initialFilters: Filters = {
  search: "",
  sku: "",
  name: "",
  categoryId: "",
  activeOnly: false,
  withoutStockOnly: false,
};

export default function AdminStockSection({ userRole }: { userRole?: string | null }) {
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [adjustingRow, setAdjustingRow] = useState<VariantRow | null>(null);
  const [adjustStockValue, setAdjustStockValue] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("product");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const didMountFiltersRef = useRef(false);
  const storeId = getClientStoreId();
  const pricingPolicy = useMemo(
    () => resolveStorePricingPolicy({ storeId }),
    [storeId],
  );
  const canAdjustStock = userRole !== "STAFF";

  useEffect(() => {
    api("/categories")
      .then((payload) => setCategories(Array.isArray(payload) ? (payload as Category[]) : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!didMountFiltersRef.current) {
      didMountFiltersRef.current = true;
      return;
    }

    const timeout = window.setTimeout(() => {
      if (page === 1) {
        void loadRows(1);
      } else {
        setPage(1);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
    // loadRows intentionally closes over the current filters for the debounced fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    void loadRows(page);
    // loadRows intentionally closes over sorting state for the current page request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortKey, sortDirection]);

  const sortedRows = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;

    return [...rows].sort((a, b) => {
      const left = sortValue(a, sortKey, pricingPolicy);
      const right = sortValue(b, sortKey, pricingPolicy);

      if (typeof left === "number" && typeof right === "number") {
        return (left - right) * direction;
      }

      return String(left).localeCompare(String(right), "es", { numeric: true }) * direction;
    });
  }, [pricingPolicy, rows, sortDirection, sortKey]);

  const stockTotal = rows.reduce((total, row) => total + Number(row.stock || 0), 0);
  const withoutStock = rows.filter((row) => Number(row.stock || 0) <= 0).length;

  function buildParams(page: number, limit: number) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      activeOnly: String(filters.activeOnly),
    });
    if (filters.search.trim()) params.set("search", filters.search.trim());
    if (filters.sku.trim()) params.set("sku", filters.sku.trim());
    if (filters.name.trim()) params.set("name", filters.name.trim());
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.withoutStockOnly) params.set("withoutStockOnly", "true");
    if (!["stock", "active"].includes(sortKey)) {
      params.set("sortBy", sortKey);
      params.set("sortDirection", sortDirection);
    }
    return params;
  }

  async function loadRows(nextPage = page) {
    setLoading(true);
    setNotice("");
    try {
      const payload = await api(`/admin/labels/products?${buildParams(nextPage, 40)}`) as {
        items: VariantRow[];
        total: number;
        page: number;
        totalPages: number;
      };
      setRows(payload.items);
      setPage(Number(payload.page ?? nextPage));
      setTotalRows(Number(payload.total ?? payload.items.length));
      setTotalPages(Math.max(1, Number(payload.totalPages ?? 1)));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo cargar stock.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  function changeSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      setPage(1);
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "stock" ? "desc" : "asc");
    setPage(1);
  }

  function openAdjustModal(row: VariantRow) {
    setAdjustingRow(row);
    setAdjustStockValue(String(row.stock ?? 0));
    setNotice("");
  }

  async function updateStock() {
    if (!adjustingRow) return;

    const parsed = Number(adjustStockValue);
    const quantity = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;

    setSavingId(adjustingRow.id);
    setNotice("");
    try {
      await api(`/inventory/${adjustingRow.id}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      });
      setRows((current) =>
        current.map((item) => item.id === adjustingRow.id ? { ...item, stock: quantity } : item),
      );
      setNotice(`Stock actualizado para ${adjustingRow.productName}.`);
      setAdjustingRow(null);
      setAdjustStockValue("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo actualizar stock.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section style={shellStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Inventario</p>
          <h2 style={titleStyle}>Stock</h2>
        </div>
        <div style={statsStyle}>
          <Stat label="Variantes" value={String(totalRows)} />
          <Stat label="Unidades pagina" value={String(stockTotal)} />
          <Stat label="Sin stock pagina" value={String(withoutStock)} />
        </div>
      </header>

      {notice ? <div style={noticeStyle}>{notice}</div> : null}

      <div style={panelGridStyle}>
        <aside style={filtersStyle}>
          <Field label="Buscador">
            <input style={inputStyle} value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Nombre, SKU o variante" />
          </Field>
          <Field label="SKU">
            <input style={inputStyle} value={filters.sku} onChange={(event) => setFilters({ ...filters, sku: event.target.value })} />
          </Field>
          <Field label="Nombre">
            <input style={inputStyle} value={filters.name} onChange={(event) => setFilters({ ...filters, name: event.target.value })} />
          </Field>
          <Field label="Categoria">
            <select style={inputStyle} value={filters.categoryId} onChange={(event) => setFilters({ ...filters, categoryId: event.target.value })}>
              <option value="">Todas</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </Field>
          <label style={checkStyle}>
            <input type="checkbox" checked={filters.activeOnly} onChange={(event) => setFilters({ ...filters, activeOnly: event.target.checked })} />
            Solo activas
          </label>
          <label style={checkStyle}>
            <input type="checkbox" checked={filters.withoutStockOnly} onChange={(event) => setFilters({ ...filters, withoutStockOnly: event.target.checked })} />
            Sin stock
          </label>
          <button type="button" style={ghostButtonStyle} onClick={() => setFilters(initialFilters)}>
            Limpiar filtros
          </button>
        </aside>

        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <SortableTh sortKey="product" activeKey={sortKey} direction={sortDirection} onSort={changeSort}>Producto</SortableTh>
                <SortableTh sortKey="variant" activeKey={sortKey} direction={sortDirection} onSort={changeSort}>Variante</SortableTh>
                <SortableTh sortKey="sku" activeKey={sortKey} direction={sortDirection} onSort={changeSort}>SKU</SortableTh>
                <SortableTh sortKey="stock" activeKey={sortKey} direction={sortDirection} onSort={changeSort}>Stock</SortableTh>
                <SortableTh sortKey="price" activeKey={sortKey} direction={sortDirection} onSort={changeSort}>Precio</SortableTh>
                <SortableTh sortKey="active" activeKey={sortKey} direction={sortDirection} onSort={changeSort}>Estado</SortableTh>
                {canAdjustStock ? <th style={thStyle}>Accion</th> : null}
              </tr>
            </thead>
            <tbody>
              {loading ? <StateRow colSpan={canAdjustStock ? 7 : 6} label="Cargando variantes..." /> : null}
              {!loading && sortedRows.length === 0 ? <StateRow colSpan={canAdjustStock ? 7 : 6} label="No hay variantes para estos filtros." /> : null}
              {!loading && sortedRows.map((row) => (
                <tr key={row.id}>
                  <td style={tdStyle}>
                    <div style={productCellStyle}>
                      <ProductThumb row={row} />
                      <strong>{row.productName}</strong>
                    </div>
                  </td>
                  <td style={tdStyle}>{row.variantName || "Unica"}</td>
                  <td style={tdStyle}>{row.sku?.trim() ? <code>{row.sku}</code> : <span style={mutedStyle}>Sin SKU</span>}</td>
                  <td style={tdStyle}><strong>{row.stock}</strong></td>
                  <td style={tdStyle}>{money(resolveManualSaleUnitPrice(row.price, pricingPolicy))}</td>
                  <td style={tdStyle}>{row.active ? "Activa" : "Oculta"}</td>
                  {canAdjustStock ? (
                    <td style={tdStyle}>
                      <button
                        type="button"
                        style={primaryButtonStyle}
                        disabled={savingId === row.id}
                        onClick={() => openAdjustModal(row)}
                      >
                        Ajustar
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={paginationStyle}>
            <span style={mutedStyle}>
              Pagina {page} de {totalPages}
            </span>
            <div style={paginationActionsStyle}>
              <button
                type="button"
                style={ghostButtonStyle}
                disabled={loading || page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Anterior
              </button>
              <button
                type="button"
                style={ghostButtonStyle}
                disabled={loading || page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>

      {adjustingRow ? (
        <div style={modalOverlayStyle} onClick={() => savingId ? null : setAdjustingRow(null)}>
          <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>Ajustar stock</p>
                <h3 style={modalTitleStyle}>{adjustingRow.productName}</h3>
                <span style={mutedStyle}>
                  {adjustingRow.variantName || "Unica"}
                  {adjustingRow.sku ? ` - ${adjustingRow.sku}` : ""}
                </span>
              </div>
              <button type="button" style={iconButtonStyle} onClick={() => setAdjustingRow(null)} disabled={Boolean(savingId)}>
                x
              </button>
            </div>

            <div style={currentStockStyle}>
              <span>Stock actual</span>
              <strong>{adjustingRow.stock}</strong>
            </div>

            <Field label="Nuevo stock">
              <input
                type="number"
                min={0}
                step={1}
                autoFocus
                style={inputStyle}
                value={adjustStockValue}
                onChange={(event) => setAdjustStockValue(event.target.value)}
              />
            </Field>

            <div style={modalActionsStyle}>
              <button type="button" style={ghostButtonStyle} onClick={() => setAdjustingRow(null)} disabled={Boolean(savingId)}>
                Cancelar
              </button>
              <button type="button" style={primaryButtonStyle} onClick={() => void updateStock()} disabled={Boolean(savingId)}>
                {savingId ? "Guardando..." : "Guardar ajuste"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function sortValue(
  row: VariantRow,
  key: SortKey,
  pricingPolicy: ReturnType<typeof resolveStorePricingPolicy>,
) {
  switch (key) {
    case "product":
      return row.productName ?? "";
    case "variant":
      return row.variantName ?? "";
    case "sku":
      return row.sku ?? "";
    case "stock":
      return Number(row.stock ?? 0);
    case "price":
      return resolveManualSaleUnitPrice(row.price, pricingPolicy);
    case "active":
      return row.active ? 1 : 0;
  }
}

function SortableTh({
  children,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  children: React.ReactNode;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const active = activeKey === sortKey;
  return (
    <th style={thStyle}>
      <button type="button" style={sortButtonStyle} onClick={() => onSort(sortKey)}>
        {children}
        {active ? <span>{direction === "asc" ? "^" : "v"}</span> : null}
      </button>
    </th>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={fieldStyle}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={statStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StateRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ ...tdStyle, color: "var(--account-text-muted)", textAlign: "center", padding: 28 }}>
        {label}
      </td>
    </tr>
  );
}

function ProductThumb({ row }: { row: VariantRow }) {
  const src = resolveImageUrl(row.imageUrl);

  if (!src) {
    return <span style={thumbEmptyStyle}>{row.productName.slice(0, 1).toUpperCase()}</span>;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" style={thumbStyle} />;
}

function resolveImageUrl(imageUrl: string | null) {
  if (!imageUrl) return null;
  if (/^(https?:|data:|blob:)/u.test(imageUrl)) return imageUrl;

  if (imageUrl.startsWith("/uploads")) {
    try {
      return `${new URL(getPublicApiUrl()).origin}${imageUrl}`;
    } catch {
      return imageUrl;
    }
  }

  return imageUrl;
}

const shellStyle: React.CSSProperties = { display: "grid", gap: 18 };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 18, alignItems: "end", flexWrap: "wrap" };
const eyebrowStyle: React.CSSProperties = { margin: "0 0 4px", color: "var(--account-text-muted)", textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, fontWeight: 800 };
const titleStyle: React.CSSProperties = { margin: 0, color: "var(--account-text-strong)", fontSize: 28 };
const statsStyle: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };
const statStyle: React.CSSProperties = { minWidth: 116, border: "1px solid var(--account-item-border)", borderRadius: 14, background: "var(--account-item-bg)", padding: "10px 12px", display: "grid", gap: 4 };
const panelGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(220px, 280px) minmax(0, 1fr)", gap: 16, alignItems: "start" };
const filtersStyle: React.CSSProperties = { border: "1px solid var(--account-item-border)", borderRadius: 18, background: "var(--account-item-bg)", padding: 16, display: "grid", gap: 12 };
const fieldStyle: React.CSSProperties = { display: "grid", gap: 6, color: "var(--account-text-muted)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" };
const inputStyle: React.CSSProperties = { width: "100%", minHeight: 40, border: "1px solid var(--account-item-border)", borderRadius: 12, background: "var(--account-sidebar-bg)", color: "var(--account-text-strong)", padding: "0 12px", font: "inherit" };
const checkStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, color: "var(--account-text-strong)", fontWeight: 700 };
const tableWrapStyle: React.CSSProperties = { minWidth: 0, overflow: "auto", border: "1px solid var(--account-item-border)", borderRadius: 18, background: "var(--account-item-bg)" };
const tableStyle: React.CSSProperties = { width: "100%", minWidth: 860, borderCollapse: "collapse" };
const paginationStyle: React.CSSProperties = { minWidth: 860, borderTop: "1px solid var(--account-item-border)", padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" };
const paginationActionsStyle: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center" };
const thStyle: React.CSSProperties = { padding: "12px 14px", borderBottom: "1px solid var(--account-item-border)", color: "var(--account-text-muted)", textAlign: "left", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "12px 14px", borderBottom: "1px solid var(--account-item-border)", color: "var(--account-text-strong)", verticalAlign: "middle" };
const sortButtonStyle: React.CSSProperties = { border: 0, background: "transparent", color: "inherit", padding: 0, font: "inherit", textTransform: "inherit", letterSpacing: "inherit", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };
const productCellStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, minWidth: 220 };
const thumbStyle: React.CSSProperties = { width: 42, height: 42, borderRadius: 10, objectFit: "cover", border: "1px solid var(--account-item-border)" };
const thumbEmptyStyle: React.CSSProperties = { width: 42, height: 42, borderRadius: 10, display: "grid", placeItems: "center", border: "1px solid var(--account-item-border)", background: "var(--account-sidebar-bg)", color: "var(--account-text-muted)", fontWeight: 800 };
const primaryButtonStyle: React.CSSProperties = { minHeight: 36, border: "1px solid var(--account-item-border)", borderRadius: 12, background: "var(--account-item-bg-active)", color: "var(--account-text-strong)", fontWeight: 800, padding: "0 12px", cursor: "pointer" };
const ghostButtonStyle: React.CSSProperties = { minHeight: 40, border: "1px solid var(--account-item-border)", borderRadius: 12, background: "var(--account-sidebar-bg)", color: "var(--account-text-strong)", fontWeight: 800, padding: "0 12px", cursor: "pointer" };
const noticeStyle: React.CSSProperties = { border: "1px solid var(--account-item-border)", borderRadius: 14, background: "var(--account-item-bg)", color: "var(--account-text-strong)", padding: "12px 14px" };
const mutedStyle: React.CSSProperties = { color: "var(--account-text-muted)" };
const modalOverlayStyle: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.42)", display: "grid", placeItems: "center", padding: 16 };
const modalStyle: React.CSSProperties = { width: "min(520px, 100%)", border: "1px solid var(--account-item-border)", borderRadius: 20, background: "var(--account-sidebar-bg)", boxShadow: "var(--admin-modal-shadow)", padding: 20, display: "grid", gap: 16 };
const modalHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 14, alignItems: "start" };
const modalTitleStyle: React.CSSProperties = { margin: "0 0 4px", color: "var(--account-text-strong)", fontSize: 22 };
const iconButtonStyle: React.CSSProperties = { width: 36, height: 36, borderRadius: 999, border: "1px solid var(--account-item-border)", background: "var(--account-item-bg)", color: "var(--account-text-strong)", cursor: "pointer", fontWeight: 900 };
const currentStockStyle: React.CSSProperties = { border: "1px solid var(--account-item-border)", borderRadius: 16, background: "var(--account-item-bg)", padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--account-text-strong)" };
const modalActionsStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 };
