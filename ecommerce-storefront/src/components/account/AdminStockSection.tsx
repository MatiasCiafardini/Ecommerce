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
  color?: string | null;
  size?: string | null;
  sku: string;
  stock: number;
  price: number;
  imageUrl: string | null;
  active: boolean;
  categories: { id: number; name: string }[];
  inventoryPolicy: InventoryPolicy;
  lowStockThreshold: number;
};

type InventoryPolicy = "UNCLASSIFIED" | "RESTOCK" | "NO_RESTOCK" | "UNTRACKED";
type InventoryMovement = {
  id: number; type: string; origin: string; reason?: string | null; quantityDelta: number; reservedDelta: number;
  quantityBefore: number; quantityAfter: number; reservedBefore: number; reservedAfter: number; approximate: boolean; createdAt: string;
  actorName?: string | null; actorEmail?: string | null;
  variant: { id: number; sku: string; Color?: string | null; Size?: string | null; product: { id: number; title: string } };
};
type AnalyticsRow = {
  productId: number; title: string; brand?: string | null; published: boolean; inventoryPolicy: InventoryPolicy; lowStockThreshold: number;
  onHand: number; reserved: number; available: number; retailValue: number; sold90: number; sellThrough: number;
  lastLoadAt?: string | null; lastSaleAt?: string | null; noSaleDays?: number | null; ageDays?: number | null; ageApproximate: boolean;
};
type AnalyticsPayload = {
  summary: { products: number; onHand: number; reserved: number; available: number; retailValue: number; withoutStock: number; lowStock: number; unclassified: number; noSales30: number; noSales60: number; noSales90: number };
  agingBuckets: { key: string; label: string; products: number }[];
  rankings: { fastest: AnalyticsRow[]; slowest: AnalyticsRow[] };
  items: AnalyticsRow[]; total: number; page: number; totalPages: number;
};

type Category = { id: number; name: string };
type FilterOptions = { colors: string[]; sizes: string[] };
type SortKey = "product" | "color" | "size" | "sku" | "stock" | "price" | "active";
type SortDirection = "asc" | "desc";

type Filters = {
  search: string;
  sku: string;
  name: string;
  color: string;
  size: string;
  categoryId: string;
  activeOnly: boolean;
  withoutStockOnly: boolean;
};

const initialFilters: Filters = {
  search: "",
  sku: "",
  name: "",
  color: "",
  size: "",
  categoryId: "",
  activeOnly: false,
  withoutStockOnly: false,
};

export default function AdminStockSection({ userRole, onOpenProduct }: { userRole?: string | null; onOpenProduct?: (productId: number) => void }) {
  const [workspaceTab, setWorkspaceTab] = useState<"inventory" | "analytics">("inventory");
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ colors: [], sizes: [] });
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
  const [adjustReason, setAdjustReason] = useState("");
  const [historyRow, setHistoryRow] = useState<VariantRow | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsSearch, setAnalyticsSearch] = useState("");
  const [analyticsPolicy, setAnalyticsPolicy] = useState("");
  const [analyticsAging, setAnalyticsAging] = useState("");
  const [analyticsAlert, setAnalyticsAlert] = useState("");
  const [selectedAnalyticsIds, setSelectedAnalyticsIds] = useState<number[]>([]);
  const [bulkPolicy, setBulkPolicy] = useState<InventoryPolicy>("RESTOCK");
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

  useEffect(() => {
    if (workspaceTab !== "analytics") return;
    const timeout = window.setTimeout(() => void loadAnalytics(), 200);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceTab, analyticsSearch, analyticsPolicy, analyticsAging, analyticsAlert]);

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
    if (filters.color.trim()) params.set("color", filters.color.trim());
    if (filters.size.trim()) params.set("size", filters.size.trim());
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
        filterOptions?: FilterOptions;
        total: number;
        page: number;
        totalPages: number;
      };
      setRows(payload.items);
      setFilterOptions(normalizeFilterOptions(payload.filterOptions ?? buildFilterOptionsFromRows(payload.items)));
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
    setAdjustReason("");
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
        body: JSON.stringify({ quantity, reason: adjustReason.trim() || undefined }),
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

  async function openHistory(row: VariantRow) {
    setHistoryRow(row);
    setHistoryLoading(true);
    try {
      const payload = await api(`/inventory/movements?variantId=${row.id}&pageSize=100`) as { items: InventoryMovement[] };
      setMovements(Array.isArray(payload.items) ? payload.items : []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo cargar el historial.");
      setMovements([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadAnalytics() {
    setAnalyticsLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "80" });
      if (analyticsSearch.trim()) params.set("search", analyticsSearch.trim());
      if (analyticsPolicy) params.set("policy", analyticsPolicy);
      if (analyticsAging) params.set("agingBucket", analyticsAging);
      if (analyticsAlert) params.set("alert", analyticsAlert);
      setAnalytics(await api(`/inventory/analytics?${params}`) as AnalyticsPayload);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo cargar la analitica.");
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function updatePolicy(productId: number, inventoryPolicy: InventoryPolicy) {
    await api("/products/admin/inventory-policy", { method: "PATCH", body: JSON.stringify({ productIds: [productId], inventoryPolicy }) });
    setRows((current) => current.map((row) => row.productId === productId ? { ...row, inventoryPolicy } : row));
    await loadAnalytics();
  }

  async function updatePolicies() {
    if (!selectedAnalyticsIds.length) return;
    await api("/products/admin/inventory-policy", { method: "PATCH", body: JSON.stringify({ productIds: selectedAnalyticsIds, inventoryPolicy: bulkPolicy }) });
    setSelectedAnalyticsIds([]);
    await loadAnalytics();
  }

  function exportAnalytics() {
    const params = new URLSearchParams();
    if (analyticsSearch.trim()) params.set("search", analyticsSearch.trim());
    if (analyticsPolicy) params.set("policy", analyticsPolicy);
    if (analyticsAging) params.set("agingBucket", analyticsAging);
    if (analyticsAlert) params.set("alert", analyticsAlert);
    window.location.href = `/api/proxy/inventory/analytics/export.csv?${params}`;
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

      <div style={tabsStyle}>
        <button type="button" style={tabButtonStyle(workspaceTab === "inventory")} onClick={() => setWorkspaceTab("inventory")}>Inventario</button>
        <button type="button" style={tabButtonStyle(workspaceTab === "analytics")} onClick={() => setWorkspaceTab("analytics")}>Analitica</button>
      </div>

      {notice ? <div style={noticeStyle}>{notice}</div> : null}

      {workspaceTab === "inventory" ? (
      <div style={panelGridStyle}>
        <aside style={filtersStyle}>
          <Field label="Buscador">
            <input style={inputStyle} value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Nombre, SKU, color o talle" />
          </Field>
          <Field label="SKU">
            <input style={inputStyle} value={filters.sku} onChange={(event) => setFilters({ ...filters, sku: event.target.value })} />
          </Field>
          <Field label="Nombre">
            <input style={inputStyle} value={filters.name} onChange={(event) => setFilters({ ...filters, name: event.target.value })} />
          </Field>
          <Field label="Color">
            <select style={inputStyle} value={filters.color} onChange={(event) => setFilters({ ...filters, color: event.target.value })}>
              <option value="">Todos los colores</option>
              {withSelectedOption(filterOptions.colors, filters.color).map((color) => <option key={color} value={color}>{color}</option>)}
            </select>
          </Field>
          <Field label="Talle">
            <select style={inputStyle} value={filters.size} onChange={(event) => setFilters({ ...filters, size: event.target.value })}>
              <option value="">Todos los talles</option>
              {withSelectedOption(filterOptions.sizes, filters.size).map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
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
                <SortableTh sortKey="color" activeKey={sortKey} direction={sortDirection} onSort={changeSort}>Color</SortableTh>
                <SortableTh sortKey="size" activeKey={sortKey} direction={sortDirection} onSort={changeSort}>Talle</SortableTh>
                <SortableTh sortKey="sku" activeKey={sortKey} direction={sortDirection} onSort={changeSort}>SKU</SortableTh>
                <SortableTh sortKey="stock" activeKey={sortKey} direction={sortDirection} onSort={changeSort}>Stock</SortableTh>
                <SortableTh sortKey="price" activeKey={sortKey} direction={sortDirection} onSort={changeSort}>Precio</SortableTh>
                <SortableTh sortKey="active" activeKey={sortKey} direction={sortDirection} onSort={changeSort}>Estado</SortableTh>
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <StateRow colSpan={8} label="Cargando variantes..." /> : null}
              {!loading && sortedRows.length === 0 ? <StateRow colSpan={8} label="No hay variantes para estos filtros." /> : null}
              {!loading && sortedRows.map((row) => (
                <tr key={row.id}>
                  <td style={tdStyle}>
                    <div style={productCellStyle}>
                      <ProductThumb row={row} />
                      <strong>{row.productName}</strong>
                    </div>
                  </td>
                  <td style={tdStyle}>{formatAttribute(row.color, "Sin color")}</td>
                  <td style={tdStyle}>{formatAttribute(row.size, "Sin talle")}</td>
                  <td style={tdStyle}>{row.sku?.trim() ? <code>{row.sku}</code> : <span style={mutedStyle}>Sin SKU</span>}</td>
                  <td style={tdStyle}><strong>{row.stock}</strong></td>
                  <td style={tdStyle}>{money(resolveManualSaleUnitPrice(row.price, pricingPolicy))}</td>
                  <td style={tdStyle}><strong>{row.active ? "Activa" : "Oculta"}</strong><small style={{ display: "block", ...mutedStyle }}>{policyLabel(row.inventoryPolicy)}</small></td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button type="button" style={ghostButtonStyle} onClick={() => void openHistory(row)}>Historial</button>
                      {canAdjustStock ? (
                      <button
                        type="button"
                        style={primaryButtonStyle}
                        disabled={savingId === row.id}
                        onClick={() => openAdjustModal(row)}
                      >
                        Ajustar
                      </button>
                      ) : null}
                    </div>
                  </td>
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
      ) : (
        <section style={{ display: "grid", gap: 16 }}>
          <div style={analyticsToolbarStyle}>
            <input style={inputStyle} value={analyticsSearch} onChange={(event) => setAnalyticsSearch(event.target.value)} placeholder="Buscar producto, marca o SKU" />
            <select style={inputStyle} value={analyticsPolicy} onChange={(event) => setAnalyticsPolicy(event.target.value)}>
              <option value="">Todas las politicas</option>
              <option value="UNCLASSIFIED">Sin clasificar</option><option value="RESTOCK">Reponer</option><option value="NO_RESTOCK">No reponer</option><option value="UNTRACKED">Sin seguimiento</option>
            </select>
            <select style={inputStyle} value={analyticsAging} onChange={(event) => setAnalyticsAging(event.target.value)}><option value="">Toda antiguedad</option><option value="0-90">0 a 90 dias</option><option value="91-180">91 a 180 dias</option><option value="181-365">181 a 365 dias</option><option value="365+">Mas de 365 dias</option></select>
            <select style={inputStyle} value={analyticsAlert} onChange={(event) => setAnalyticsAlert(event.target.value)}><option value="">Todas las alertas</option><option value="without-stock">Sin stock accionable</option><option value="low-stock">Stock bajo</option></select>
            <button type="button" style={ghostButtonStyle} onClick={exportAnalytics}>Exportar CSV</button>
          </div>
          {canAdjustStock ? <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}><strong style={{ color: "var(--account-text-strong)" }}>{selectedAnalyticsIds.length} seleccionados</strong><select style={compactSelectStyle} value={bulkPolicy} onChange={(event) => setBulkPolicy(event.target.value as InventoryPolicy)}>{policyOptions()}</select><button type="button" style={primaryButtonStyle} disabled={!selectedAnalyticsIds.length} onClick={() => void updatePolicies()}>Aplicar politica</button></div> : null}
          {analyticsLoading && !analytics ? <div style={noticeStyle}>Cargando analitica...</div> : null}
          {analytics ? (
            <>
              <div style={analyticsStatsStyle}>
                <Stat label="Unidades" value={String(analytics.summary.onHand)} />
                <Stat label="Reservadas" value={String(analytics.summary.reserved)} />
                <Stat label="Valor a precio de venta" value={money(analytics.summary.retailValue)} />
                <Stat label="Sin stock accionable" value={String(analytics.summary.withoutStock)} />
                <Stat label="Stock bajo" value={String(analytics.summary.lowStock)} />
                <Stat label="Sin clasificar" value={String(analytics.summary.unclassified)} />
              </div>
              <div style={agingGridStyle}>
                {analytics.agingBuckets.map((bucket) => <article key={bucket.key} style={agingCardStyle}><span>{bucket.label}</span><strong>{bucket.products}</strong><small>productos con stock</small></article>)}
                <article style={agingCardStyle}><span>Sin ventas 30 dias</span><strong>{analytics.summary.noSales30}</strong><small>productos con stock</small></article>
                <article style={agingCardStyle}><span>Sin ventas 60 dias</span><strong>{analytics.summary.noSales60}</strong><small>productos con stock</small></article>
                <article style={agingCardStyle}><span>Sin ventas 90 dias</span><strong>{analytics.summary.noSales90}</strong><small>productos con stock</small></article>
              </div>
              <div style={rankingGridStyle}>
                <Ranking title="Mayor rotacion" rows={analytics.rankings.fastest} detail={(row) => `${row.sellThrough}% sell-through · ${row.sold90} ventas`} />
                <Ranking title="Stock de menor rotacion" rows={analytics.rankings.slowest} detail={(row) => `${row.sold90} ventas · ${row.ageDays == null ? "edad sin dato" : `${row.ageDays} dias`}`} />
              </div>
              <div style={tableWrapStyle}>
                <table style={tableStyle}>
                  <thead><tr>{canAdjustStock ? <th style={thStyle}><input type="checkbox" aria-label="Seleccionar pagina" checked={Boolean(analytics.items.length) && analytics.items.every((row) => selectedAnalyticsIds.includes(row.productId))} onChange={(event) => setSelectedAnalyticsIds(event.target.checked ? analytics.items.map((row) => row.productId) : [])} /></th> : null}<th style={thStyle}>Producto</th><th style={thStyle}>Politica</th><th style={thStyle}>Stock</th><th style={thStyle}>Antiguedad</th><th style={thStyle}>Ultima venta</th><th style={thStyle}>Ventas 90d</th><th style={thStyle}>Rotacion</th><th style={thStyle}>Valor</th></tr></thead>
                  <tbody>
                    {analytics.items.map((row) => (
                      <tr key={row.productId}>
                        {canAdjustStock ? <td style={tdStyle}><input type="checkbox" checked={selectedAnalyticsIds.includes(row.productId)} onChange={(event) => setSelectedAnalyticsIds((current) => event.target.checked ? [...new Set([...current, row.productId])] : current.filter((id) => id !== row.productId))} /></td> : null}
                        <td style={tdStyle}><button type="button" onClick={() => onOpenProduct?.(row.productId)} style={{ border: 0, padding: 0, background: "transparent", color: "var(--account-text-strong)", cursor: onOpenProduct ? "pointer" : "default", textAlign: "left" }}><strong>{row.title}</strong><small style={{ display: "block", ...mutedStyle }}>{row.brand || "Sin marca"}</small></button></td>
                        <td style={tdStyle}>{canAdjustStock ? <select style={compactSelectStyle} value={row.inventoryPolicy} onChange={(event) => void updatePolicy(row.productId, event.target.value as InventoryPolicy)}>{policyOptions()}</select> : policyLabel(row.inventoryPolicy)}</td>
                        <td style={tdStyle}><strong>{row.available}</strong><small style={{ display: "block", ...mutedStyle }}>{row.reserved} reservadas</small></td>
                        <td style={tdStyle}>{row.ageDays === null || row.ageDays === undefined ? "Sin dato" : `${row.ageDays} dias${row.ageApproximate ? "*" : ""}`}</td>
                        <td style={tdStyle}>{formatDate(row.lastSaleAt)}</td><td style={tdStyle}>{row.sold90}</td><td style={tdStyle}>{row.sellThrough}%</td><td style={tdStyle}>{money(row.retailValue)}</td>
                      </tr>
                    ))}
                    {!analytics.items.length ? <StateRow colSpan={canAdjustStock ? 9 : 8} label="No hay productos para estos filtros." /> : null}
                  </tbody>
                </table>
              </div>
              <small style={mutedStyle}>* La antiguedad del saldo inicial es aproximada desde la habilitacion del historial.</small>
            </>
          ) : null}
        </section>
      )}

      {adjustingRow ? (
        <div style={modalOverlayStyle} onClick={() => savingId ? null : setAdjustingRow(null)}>
          <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>Ajustar stock</p>
                <h3 style={modalTitleStyle}>{adjustingRow.productName}</h3>
                <span style={mutedStyle}>
                  {variantSummary(adjustingRow)}
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
            <Field label="Motivo (opcional)"><input style={inputStyle} value={adjustReason} onChange={(event) => setAdjustReason(event.target.value)} placeholder="Ej. ingreso de mercaderia o correccion" /></Field>

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

      {historyRow ? (
        <div style={modalOverlayStyle} onClick={() => setHistoryRow(null)}>
          <div style={{ ...modalStyle, width: "min(900px, 100%)", maxHeight: "85vh", overflow: "auto" }} onClick={(event) => event.stopPropagation()}>
            <div style={modalHeaderStyle}><div><p style={eyebrowStyle}>Historial de stock</p><h3 style={modalTitleStyle}>{historyRow.productName}</h3><span style={mutedStyle}>{variantSummary(historyRow)} · {historyRow.sku}</span></div><button type="button" style={iconButtonStyle} onClick={() => setHistoryRow(null)}>x</button></div>
            {historyLoading ? <div style={noticeStyle}>Cargando movimientos...</div> : (
              <div style={tableWrapStyle}><table style={tableStyle}><thead><tr><th style={thStyle}>Fecha</th><th style={thStyle}>Origen</th><th style={thStyle}>Cambio</th><th style={thStyle}>Stock</th><th style={thStyle}>Usuario / motivo</th></tr></thead><tbody>
                {movements.map((movement) => <tr key={movement.id}><td style={tdStyle}>{formatDate(movement.createdAt)}</td><td style={tdStyle}>{movementTypeLabel(movement.type)}</td><td style={tdStyle}><strong style={{ color: movement.quantityDelta >= 0 ? "#39b77a" : "#df6b6b" }}>{signed(movement.quantityDelta)}</strong>{movement.reservedDelta ? <small style={{ display: "block", ...mutedStyle }}>Reserva {signed(movement.reservedDelta)}</small> : null}</td><td style={tdStyle}>{movement.quantityBefore} → {movement.quantityAfter}</td><td style={tdStyle}>{movement.actorName || movement.actorEmail || "Sistema"}<small style={{ display: "block", ...mutedStyle }}>{movement.reason || (movement.approximate ? "Saldo inicial aproximado" : "")}</small></td></tr>)}
                {!movements.length ? <StateRow colSpan={5} label="Todavia no hay movimientos registrados." /> : null}
              </tbody></table></div>
            )}
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
    case "color":
      return row.color ?? "";
    case "size":
      return row.size ?? "";
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

function formatAttribute(value: string | null | undefined, fallback: string) {
  const text = value?.trim();
  return text || <span style={mutedStyle}>{fallback}</span>;
}

function variantSummary(row: Pick<VariantRow, "color" | "size" | "variantName">) {
  const parts = [row.color, row.size]
    .map((value) => value?.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(" - ") : row.variantName?.trim() || "Unica";
}

function policyLabel(policy?: InventoryPolicy) {
  return ({ UNCLASSIFIED: "Sin clasificar", RESTOCK: "Reponer", NO_RESTOCK: "No reponer", UNTRACKED: "Sin seguimiento" } as Record<string, string>)[policy ?? ""] ?? "Sin clasificar";
}

function policyOptions() {
  return (["UNCLASSIFIED", "RESTOCK", "NO_RESTOCK", "UNTRACKED"] as InventoryPolicy[]).map((policy) => <option key={policy} value={policy}>{policyLabel(policy)}</option>);
}

function formatDate(value?: string | null) {
  if (!value) return "Sin ventas";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function movementTypeLabel(type: string) {
  return ({ OPENING_BALANCE: "Saldo inicial", INITIAL_LOAD: "Carga inicial", MANUAL_ADJUSTMENT: "Ajuste manual", RESERVATION: "Reserva", RESERVATION_RELEASE: "Liberacion", SALE: "Venta", CANCELLATION_RESTOCK: "Cancelacion", RETURN_RESTOCK: "Devolucion", EXCHANGE_OUT: "Cambio", ORDER_EDIT: "Edicion de venta", TRIAL_RESERVATION: "Prueba", TRIAL_RELEASE: "Devolucion de prueba", TRIAL_SALE: "Venta de prueba", SYSTEM_CORRECTION: "Correccion" } as Record<string, string>)[type] ?? type;
}

function Ranking({ title, rows, detail }: { title: string; rows: AnalyticsRow[]; detail: (row: AnalyticsRow) => string }) {
  return <article style={rankingCardStyle}><strong>{title}</strong>{rows.length ? rows.map((row, index) => <div key={row.productId} style={rankingRowStyle}><span>{index + 1}. {row.title}</span><small style={mutedStyle}>{detail(row)}</small></div>) : <small style={mutedStyle}>Todavia no hay datos suficientes.</small>}</article>;
}

function normalizeFilterOptions(options: FilterOptions): FilterOptions {
  return {
    colors: normalizeOptionValues(options.colors),
    sizes: normalizeOptionValues(options.sizes),
  };
}

function buildFilterOptionsFromRows(rows: VariantRow[]): FilterOptions {
  return normalizeFilterOptions({
    colors: rows.map((row) => row.color ?? ""),
    sizes: rows.map((row) => row.size ?? ""),
  });
}

function normalizeOptionValues(values: string[]) {
  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ].sort((left, right) => left.localeCompare(right, "es", { numeric: true }));
}

function withSelectedOption(options: string[], selected: string) {
  const selectedValue = selected.trim();
  if (!selectedValue || options.includes(selectedValue)) return options;
  return normalizeOptionValues([...options, selectedValue]);
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
const tabsStyle: React.CSSProperties = { display: "flex", gap: 8, borderBottom: "1px solid var(--account-item-border)", paddingBottom: 8 };
const tabButtonStyle = (active: boolean): React.CSSProperties => ({ minHeight: 40, border: "1px solid var(--account-item-border)", borderRadius: 12, background: active ? "var(--account-item-bg-active)" : "var(--account-sidebar-bg)", color: "var(--account-text-strong)", fontWeight: 800, padding: "0 16px", cursor: "pointer" });
const statStyle: React.CSSProperties = { minWidth: 116, border: "1px solid var(--account-item-border)", borderRadius: 14, background: "var(--account-item-bg)", padding: "10px 12px", display: "grid", gap: 4 };
const analyticsToolbarStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, alignItems: "center" };
const analyticsStatsStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 };
const agingGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 };
const agingCardStyle: React.CSSProperties = { border: "1px solid var(--account-item-border)", borderRadius: 16, background: "var(--account-item-bg)", color: "var(--account-text-strong)", padding: 14, display: "grid", gap: 5 };
const rankingGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 };
const rankingCardStyle: React.CSSProperties = { ...agingCardStyle, gap: 10 };
const rankingRowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, borderTop: "1px solid var(--account-item-border)", paddingTop: 8 };
const panelGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(220px, 280px) minmax(0, 1fr)", gap: 16, alignItems: "start" };
const filtersStyle: React.CSSProperties = { border: "1px solid var(--account-item-border)", borderRadius: 18, background: "var(--account-item-bg)", padding: 16, display: "grid", gap: 12 };
const fieldStyle: React.CSSProperties = { display: "grid", gap: 6, color: "var(--account-text-muted)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" };
const inputStyle: React.CSSProperties = { width: "100%", minHeight: 40, border: "1px solid var(--account-item-border)", borderRadius: 12, background: "var(--account-sidebar-bg)", color: "var(--account-text-strong)", padding: "0 12px", font: "inherit" };
const compactSelectStyle: React.CSSProperties = { ...inputStyle, minWidth: 140, minHeight: 34 };
const checkStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, color: "var(--account-text-strong)", fontWeight: 700 };
const tableWrapStyle: React.CSSProperties = { minWidth: 0, overflow: "auto", border: "1px solid var(--account-item-border)", borderRadius: 18, background: "var(--account-item-bg)" };
const tableStyle: React.CSSProperties = { width: "100%", minWidth: 960, borderCollapse: "collapse" };
const paginationStyle: React.CSSProperties = { minWidth: 960, borderTop: "1px solid var(--account-item-border)", padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" };
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
