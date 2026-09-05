"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { api } from "@/lib/api";
import { resolveManualSaleUnitPrice, resolveStorePricingPolicy } from "@/lib/pricing-policy";
import { getPublicApiUrl } from "@/lib/runtime-config";
import { getClientStoreId } from "@/lib/tenant/store-context";
import { money } from "./order-utils";
import styles from "./AdminStockSection.module.css";

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
  productCreatedAt?: string | null; firstKnownStockAt?: string | null; firstKnownStockApproximate: boolean;
  lastRestockAt?: string | null; lastStockChangeAt?: string | null; lastSaleAt?: string | null; lastSaleEstimated: boolean;
  noSaleDays?: number | null; ageDays?: number | null; ageApproximate: boolean; skus: string;
  aged90Units: number; aged180Units: number; aged365Units: number; aged90Value: number; aged180Value: number; aged365Value: number;
  immobilizedValue: number;
};
type AnalyticsPayload = {
  summary: { products: number; productsWithStock: number; onHand: number; available: number; retailValue: number; oldProducts: number; oldStockValue: number; noSales90: number; noRecentSalesValue: number; overOneYear: number; overOneYearValue: number };
  agingBuckets: { key: string; label: string; products: number; value: number }[];
  items: AnalyticsRow[]; total: number; page: number; pageSize: number; totalPages: number;
};
type AnalyticsQuickFilter = "" | "older-90" | "older-180" | "older-365" | "no-sales-90";
type AnalyticsSortKey = "ageDays" | "lastSaleAt" | "immobilizedValue";

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

const TROJANI_STORE_ID = 3;
const TROJANI_RETAIL_PRICE_MULTIPLIER = 2.4;

export default function AdminStockSection({ userRole, onOpenProduct }: { userRole?: string | null; onOpenProduct?: (productId: number) => void }) {
  const [workspaceTab, setWorkspaceTab] = useState<"inventory" | "analytics">(() => readUrlParam("stockTab") === "analytics" ? "analytics" : "inventory");
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
  const [adjustMovementKind, setAdjustMovementKind] = useState<"RESTOCK" | "CORRECTION">("CORRECTION");
  const [historyRow, setHistoryRow] = useState<VariantRow | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsSearch, setAnalyticsSearch] = useState(() => readUrlParam("stockSearch"));
  const [analyticsQuickFilter, setAnalyticsQuickFilter] = useState<AnalyticsQuickFilter>(() => normalizeQuickFilter(readUrlParam("stockFilter")));
  const [analyticsAgingBucket, setAnalyticsAgingBucket] = useState(() => readUrlParam("stockAge"));
  const [analyticsSortKey, setAnalyticsSortKey] = useState<AnalyticsSortKey>(() => normalizeAnalyticsSort(readUrlParam("stockSort")));
  const [analyticsSortDirection, setAnalyticsSortDirection] = useState<SortDirection>(() => readUrlParam("stockDirection") === "asc" ? "asc" : "desc");
  const [analyticsPage, setAnalyticsPage] = useState(() => Math.max(1, Number(readUrlParam("stockPage")) || 1));
  const [chartMode, setChartMode] = useState<"products" | "value">("products");
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<number[]>([]);
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
    if (workspaceTab !== "inventory") return;
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
  }, [filters, workspaceTab]);

  useEffect(() => {
    if (workspaceTab !== "inventory") return;
    void loadRows(page);
    // loadRows intentionally closes over sorting state for the current page request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortKey, sortDirection, workspaceTab]);

  useEffect(() => {
    if (workspaceTab !== "analytics") return;
    const timeout = window.setTimeout(() => void loadAnalytics(), 200);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceTab, analyticsSearch, analyticsQuickFilter, analyticsAgingBucket, analyticsSortKey, analyticsSortDirection, analyticsPage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("stockTab", workspaceTab);
    setOrDelete(url.searchParams, "stockSearch", analyticsSearch.trim());
    setOrDelete(url.searchParams, "stockFilter", analyticsQuickFilter);
    setOrDelete(url.searchParams, "stockAge", analyticsAgingBucket);
    url.searchParams.set("stockSort", analyticsSortKey);
    url.searchParams.set("stockDirection", analyticsSortDirection);
    url.searchParams.set("stockPage", String(analyticsPage));
    window.history.replaceState(null, "", `${url.pathname}?${url.searchParams}${url.hash}`);
  }, [workspaceTab, analyticsSearch, analyticsQuickFilter, analyticsAgingBucket, analyticsSortKey, analyticsSortDirection, analyticsPage]);

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
    setAdjustMovementKind("CORRECTION");
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
        body: JSON.stringify({ quantity, reason: adjustReason.trim() || undefined, movementKind: adjustMovementKind }),
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
    setAnalyticsError("");
    try {
      const params = new URLSearchParams({ page: String(analyticsPage), pageSize: "25", sortBy: analyticsSortKey, sortDirection: analyticsSortDirection });
      if (analyticsSearch.trim()) params.set("search", analyticsSearch.trim());
      if (analyticsQuickFilter) params.set("quickFilter", analyticsQuickFilter);
      if (analyticsAgingBucket) params.set("agingBucket", analyticsAgingBucket);
      setAnalytics(await api(`/inventory/analytics?${params}`) as AnalyticsPayload);
    } catch (error) {
      setAnalyticsError(error instanceof Error ? error.message : "No se pudo cargar la analitica.");
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function updatePolicy(productId: number, inventoryPolicy: InventoryPolicy) {
    await api("/products/admin/inventory-policy", { method: "PATCH", body: JSON.stringify({ productIds: [productId], inventoryPolicy }) });
    setRows((current) => current.map((row) => row.productId === productId ? { ...row, inventoryPolicy } : row));
  }

  async function updatePolicies() {
    if (!selectedInventoryIds.length) return;
    await api("/products/admin/inventory-policy", { method: "PATCH", body: JSON.stringify({ productIds: selectedInventoryIds, inventoryPolicy: bulkPolicy }) });
    setRows((current) => current.map((row) => selectedInventoryIds.includes(row.productId) ? { ...row, inventoryPolicy: bulkPolicy } : row));
    setSelectedInventoryIds([]);
  }

  function exportAnalytics() {
    const params = new URLSearchParams({ sortBy: analyticsSortKey, sortDirection: analyticsSortDirection });
    if (analyticsSearch.trim()) params.set("search", analyticsSearch.trim());
    if (analyticsQuickFilter) params.set("quickFilter", analyticsQuickFilter);
    if (analyticsAgingBucket) params.set("agingBucket", analyticsAgingBucket);
    window.location.href = `/api/proxy/inventory/analytics/export.csv?${params}`;
  }

  function selectQuickFilter(filter: AnalyticsQuickFilter) {
    setAnalyticsQuickFilter(filter);
    setAnalyticsAgingBucket("");
    setAnalyticsPage(1);
  }

  function selectAgeBucket(bucket: string) {
    setAnalyticsAgingBucket((current) => current === bucket ? "" : bucket);
    setAnalyticsQuickFilter("");
    setAnalyticsPage(1);
  }

  function changeAnalyticsSort(key: AnalyticsSortKey) {
    if (analyticsSortKey === key) setAnalyticsSortDirection((current) => current === "asc" ? "desc" : "asc");
    else {
      setAnalyticsSortKey(key);
      setAnalyticsSortDirection("desc");
    }
    setAnalyticsPage(1);
  }

  return (
    <section style={shellStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Inventario</p>
          <h2 style={titleStyle}>{workspaceTab === "analytics" ? "Analítica de stock" : "Stock"}</h2>
          {workspaceTab === "analytics" ? <p style={analyticsLeadStyle}>Detectá mercadería que lleva demasiado tiempo guardada y dinero que no está rotando.</p> : null}
        </div>
        {workspaceTab === "inventory" ? <div style={statsStyle}>
          <Stat label="Variantes" value={String(totalRows)} />
          <Stat label="Unidades pagina" value={String(stockTotal)} />
          <Stat label="Sin stock pagina" value={String(withoutStock)} />
        </div> : <button type="button" style={exportButtonStyle} onClick={exportAnalytics}>Exportar</button>}
      </header>

      <div style={tabsStyle}>
        <button type="button" style={tabButtonStyle(workspaceTab === "inventory")} onClick={() => setWorkspaceTab("inventory")}>Inventario</button>
        <button type="button" style={tabButtonStyle(workspaceTab === "analytics")} onClick={() => setWorkspaceTab("analytics")}>Analitica</button>
      </div>

      {workspaceTab === "inventory" && notice ? <div style={noticeStyle}>{notice}</div> : null}

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
          {canAdjustStock ? <div style={inventoryBulkStyle}><strong>{selectedInventoryIds.length} productos seleccionados</strong><select style={compactSelectStyle} value={bulkPolicy} onChange={(event) => setBulkPolicy(event.target.value as InventoryPolicy)}>{policyOptions()}</select><button type="button" style={primaryButtonStyle} disabled={!selectedInventoryIds.length} onClick={() => void updatePolicies()}>Aplicar política</button></div> : null}
          <table style={tableStyle}>
            <thead>
              <tr>
                {canAdjustStock ? <th style={thStyle}><input type="checkbox" aria-label="Seleccionar productos de esta página" checked={Boolean(rows.length) && [...new Set(rows.map((row) => row.productId))].every((id) => selectedInventoryIds.includes(id))} onChange={(event) => setSelectedInventoryIds(event.target.checked ? [...new Set(rows.map((row) => row.productId))] : [])} /></th> : null}
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
              {loading ? <StateRow colSpan={canAdjustStock ? 9 : 8} label="Cargando variantes..." /> : null}
              {!loading && sortedRows.length === 0 ? <StateRow colSpan={canAdjustStock ? 9 : 8} label="No hay variantes para estos filtros." /> : null}
              {!loading && sortedRows.map((row) => (
                <tr key={row.id}>
                  {canAdjustStock ? <td style={tdStyle}><input type="checkbox" aria-label={`Seleccionar ${row.productName}`} checked={selectedInventoryIds.includes(row.productId)} onChange={(event) => setSelectedInventoryIds((current) => event.target.checked ? [...new Set([...current, row.productId])] : current.filter((id) => id !== row.productId))} /></td> : null}
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
                  <td style={tdStyle}><strong>{row.active ? "Activa" : "Oculta"}</strong>{canAdjustStock ? <select aria-label={`Política de ${row.productName}`} style={{ ...compactSelectStyle, display: "block", marginTop: 6 }} value={row.inventoryPolicy} onChange={(event) => void updatePolicy(row.productId, event.target.value as InventoryPolicy)}>{policyOptions()}</select> : <small style={{ display: "block", ...mutedStyle }}>{policyLabel(row.inventoryPolicy)}</small>}</td>
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
        <AnalyticsDashboard
          analytics={analytics}
          showEstimatedCost={storeId === TROJANI_STORE_ID}
          loading={analyticsLoading}
          error={analyticsError}
          search={analyticsSearch}
          quickFilter={analyticsQuickFilter}
          agingBucket={analyticsAgingBucket}
          sortKey={analyticsSortKey}
          sortDirection={analyticsSortDirection}
          chartMode={chartMode}
          onSearch={(value) => { setAnalyticsSearch(value); setAnalyticsPage(1); }}
          onQuickFilter={selectQuickFilter}
          onAgeBucket={selectAgeBucket}
          onSort={changeAnalyticsSort}
          onChartMode={setChartMode}
          onPage={setAnalyticsPage}
          onRetry={() => void loadAnalytics()}
          onOpenProduct={onOpenProduct}
        />
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
            <Field label="Tipo de cambio"><select style={inputStyle} value={adjustMovementKind} onChange={(event) => setAdjustMovementKind(event.target.value as "RESTOCK" | "CORRECTION")}><option value="CORRECTION">Corrección de stock</option><option value="RESTOCK">Ingreso o reposición de mercadería</option></select></Field>
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
  return ({ OPENING_BALANCE: "Saldo inicial", INITIAL_LOAD: "Carga inicial", STOCK_RECEIPT: "Reposición", MANUAL_ADJUSTMENT: "Ajuste manual", RESERVATION: "Reserva", RESERVATION_RELEASE: "Liberacion", SALE: "Venta", CANCELLATION_RESTOCK: "Cancelacion", RETURN_RESTOCK: "Devolucion", EXCHANGE_OUT: "Cambio", ORDER_EDIT: "Edicion de venta", TRIAL_RESERVATION: "Prueba", TRIAL_RELEASE: "Devolucion de prueba", TRIAL_SALE: "Venta de prueba", SYSTEM_CORRECTION: "Correccion" } as Record<string, string>)[type] ?? type;
}

const quickFilters: Array<{ value: AnalyticsQuickFilter; label: string }> = [
  { value: "", label: "Todos" },
  { value: "older-90", label: "Más de 3 meses" },
  { value: "older-180", label: "Más de 6 meses" },
  { value: "older-365", label: "Más de un año" },
  { value: "no-sales-90", label: "Sin ventas recientes" },
];

function AnalyticsDashboard({ analytics, showEstimatedCost, loading, error, search, quickFilter, agingBucket, sortKey, sortDirection, chartMode, onSearch, onQuickFilter, onAgeBucket, onSort, onChartMode, onPage, onRetry, onOpenProduct }: {
  analytics: AnalyticsPayload | null; loading: boolean; error: string; search: string; quickFilter: AnalyticsQuickFilter; agingBucket: string;
  showEstimatedCost: boolean;
  sortKey: AnalyticsSortKey; sortDirection: SortDirection; chartMode: "products" | "value";
  onSearch: (value: string) => void; onQuickFilter: (filter: AnalyticsQuickFilter) => void; onAgeBucket: (bucket: string) => void;
  onSort: (key: AnalyticsSortKey) => void; onChartMode: (mode: "products" | "value") => void; onPage: React.Dispatch<React.SetStateAction<number>>;
  onRetry: () => void; onOpenProduct?: (productId: number) => void;
}) {
  return <section className={styles.analyticsShell}>
    {error ? <div style={noticeStyle} role="alert">No pudimos actualizar la información. {analytics ? "Seguís viendo los últimos datos disponibles." : error} <button type="button" style={inlineButtonStyle} onClick={onRetry}>Reintentar</button></div> : null}
    {loading && !analytics ? <AnalyticsSkeleton /> : null}
    {analytics ? <>
      <div className={styles.summaryGrid} aria-label="Resumen general del stock">
        <AnalyticsMetric
          label={showEstimatedCost ? "Costo total estimado" : "Valor total del stock"}
          value={money(showEstimatedCost ? analytics.summary.retailValue / TROJANI_RETAIL_PRICE_MULTIPLIER : analytics.summary.retailValue)}
          help={showEstimatedCost
            ? "Estimación calculada dividiendo por 2,4 el valor de venta actual de todas las unidades disponibles."
            : "Suma de las unidades disponibles multiplicadas por su precio de venta actual."}
        />
        <AnalyticsMetric label="Productos con stock" value={String(analytics.summary.productsWithStock)} detail="Se cuentan productos, no variantes." />
        <AnalyticsMetric label="Productos antiguos" value={String(analytics.summary.oldProducts)} detail={`${money(analytics.summary.oldStockValue)} con más de 6 meses`} tone="warm" />
        <AnalyticsMetric label="Sin ventas recientes" value={String(analytics.summary.noSales90)} detail={`${money(analytics.summary.noRecentSalesValue)} sin vender hace 90 días`} />
      </div>
      <div className={styles.alertList} aria-label="Alertas de inventario">
        {analytics.summary.oldProducts > 0 ? <InventoryAlert text={`Tenés ${productCount(analytics.summary.oldProducts)} hace más de 6 meses. Representan ${money(analytics.summary.oldStockValue)} en mercadería antigua.`} action="Ver productos antiguos" onClick={() => onQuickFilter("older-180")} /> : null}
        {analytics.summary.noSales90 > 0 ? <InventoryAlert text={`${productCount(analytics.summary.noSales90, true)} con stock ${analytics.summary.noSales90 === 1 ? "no tuvo" : "no tuvieron"} ventas en los últimos 90 días. Su valor actual es ${money(analytics.summary.noRecentSalesValue)}.`} action="Ver productos sin ventas" onClick={() => onQuickFilter("no-sales-90")} /> : null}
        {analytics.summary.overOneYear > 0 ? <InventoryAlert text={`${productCount(analytics.summary.overOneYear, true)} ${analytics.summary.overOneYear === 1 ? "conserva" : "conservan"} mercadería de hace más de un año, por ${money(analytics.summary.overOneYearValue)}.`} action="Ver mercadería de más de un año" onClick={() => onQuickFilter("older-365")} /> : null}
      </div>
      <InventoryAgeChart buckets={analytics.agingBuckets} mode={chartMode} selected={agingBucket} onModeChange={onChartMode} onSelect={onAgeBucket} />
      <section className={styles.tableSection} aria-labelledby="inventory-age-title">
        <div className={styles.tableHeading}><div><h3 id="inventory-age-title">Antigüedad del inventario</h3><p>Revisá cuándo ingresó la mercadería disponible y cuándo se vendió por última vez.</p></div>{loading ? <span style={mutedStyle} role="status">Actualizando…</span> : null}</div>
        <div className={styles.analyticsToolbar}>
          <label className={styles.searchField}><span className={styles.visuallyHidden}>Buscar</span><input style={inputStyle} value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar por producto, SKU o marca" /></label>
          <div className={styles.quickFilters} aria-label="Filtros rápidos">{quickFilters.map((filter) => <button key={filter.value || "all"} type="button" aria-pressed={quickFilter === filter.value && !agingBucket} className={quickFilter === filter.value && !agingBucket ? styles.filterChipActive : styles.filterChip} onClick={() => onQuickFilter(filter.value)}>{filter.label}</button>)}</div>
        </div>
        <div className={styles.analyticsTableWrap}>
          <table className={styles.analyticsTable}>
            <thead><tr><th>Producto</th><th>Stock actual</th><th className={styles.analyticsOptional}>Primer ingreso conocido <Help text="Primer movimiento físico de entrada que el sistema puede identificar. No es la fecha de creación del producto." /></th><th className={styles.analyticsOptional}>Última reposición <Help text="Última carga inicial o reposición registrada. No incluye correcciones, devoluciones ni anulaciones." /></th><AnalyticsSortableTh label="Última venta" sortKey="lastSaleAt" activeKey={sortKey} direction={sortDirection} onSort={onSort} /><AnalyticsSortableTh label="Tiempo en stock" sortKey="ageDays" activeKey={sortKey} direction={sortDirection} onSort={onSort} /><AnalyticsSortableTh label="Valor inmovilizado" sortKey="immobilizedValue" activeKey={sortKey} direction={sortDirection} onSort={onSort} /></tr></thead>
            <tbody>{analytics.items.map((row) => <AnalyticsProductRows key={row.productId} row={row} onOpenProduct={onOpenProduct} />)}{!analytics.items.length ? <StateRow colSpan={7} label="No encontramos productos para estos filtros. Probá quitando un filtro o cambiando la búsqueda." /> : null}</tbody>
          </table>
        </div>
        <div className={styles.analyticsPagination}><span>Página {analytics.page} de {analytics.totalPages} · {analytics.total} productos</span><div><button type="button" style={ghostButtonStyle} disabled={loading || analytics.page <= 1} onClick={() => onPage((current) => Math.max(1, current - 1))}>Anterior</button><button type="button" style={ghostButtonStyle} disabled={loading || analytics.page >= analytics.totalPages} onClick={() => onPage((current) => Math.min(analytics.totalPages, current + 1))}>Siguiente</button></div></div>
        <p className={styles.dataNote}>La antigüedad se calcula por capas FIFO de las unidades disponibles. Los saldos anteriores a la activación del historial se muestran como estimados.</p>
      </section>
    </> : null}
  </section>;
}

function AnalyticsMetric({ label, value, detail, help, tone }: { label: string; value: string; detail?: string; help?: string; tone?: "warm" }) {
  return <article className={tone === "warm" ? styles.metricWarm : styles.metric}><span>{label}{help ? <> <Help text={help} /></> : null}</span><strong>{value}</strong>{detail ? <small>{detail}</small> : null}</article>;
}

function InventoryAlert({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
  return <article className={styles.inventoryAlert}><p>{text}</p><button type="button" onClick={onClick}>{action}</button></article>;
}

function InventoryAgeChart({ buckets, mode, selected, onModeChange, onSelect }: { buckets: AnalyticsPayload["agingBuckets"]; mode: "products" | "value"; selected: string; onModeChange: (mode: "products" | "value") => void; onSelect: (bucket: string) => void }) {
  const maximum = Math.max(1, ...buckets.map((bucket) => mode === "products" ? bucket.products : bucket.value));
  return <section className={styles.chartSection} aria-labelledby="stock-age-chart-title"><div className={styles.chartHeader}><div><h3 id="stock-age-chart-title">¿Hace cuánto tiempo tenés tu stock actual?</h3><p>Seleccioná una franja para ver sus productos.</p></div><div className={styles.chartToggle} aria-label="Mostrar gráfico por"><button type="button" aria-pressed={mode === "products"} onClick={() => onModeChange("products")}>Productos</button><button type="button" aria-pressed={mode === "value"} onClick={() => onModeChange("value")}>Valor</button></div></div><div className={styles.ageChart}>{buckets.map((bucket) => { const value = mode === "products" ? bucket.products : bucket.value; return <button key={bucket.key} type="button" className={selected === bucket.key ? styles.ageBarSelected : styles.ageBar} aria-pressed={selected === bucket.key} onClick={() => onSelect(bucket.key)}><span className={styles.ageBarLabel}>{bucket.label}</span><span className={styles.ageBarTrack}><span style={{ width: `${Math.max(value > 0 ? 5 : 0, value * 100 / maximum)}%` }} /></span><strong>{mode === "products" ? productCount(bucket.products) : money(bucket.value)}</strong></button>; })}</div></section>;
}

function productCount(count: number, capitalize = false) {
  const label = `${count} ${count === 1 ? "producto" : "productos"}`;
  return capitalize ? label.charAt(0).toUpperCase() + label.slice(1) : label;
}

function AnalyticsProductRows({ row, onOpenProduct }: { row: AnalyticsRow; onOpenProduct?: (productId: number) => void }) {
  return <><tr className={styles.analyticsProductRow}><td><button type="button" className={styles.productLink} onClick={() => onOpenProduct?.(row.productId)}><strong>{row.title}</strong><small>{[row.brand, row.skus].filter(Boolean).join(" · ") || "Sin marca ni SKU"}</small></button></td><td data-label="Stock actual"><strong>{row.available}</strong> unidades</td><td className={styles.analyticsOptional}>{formatKnownDate(row.firstKnownStockAt, row.firstKnownStockApproximate)}</td><td className={styles.analyticsOptional}>{formatKnownDate(row.lastRestockAt, false)}</td><td data-label="Última venta">{formatKnownDate(row.lastSaleAt, row.lastSaleEstimated, "Sin ventas registradas")}</td><td data-label="Tiempo en stock"><strong>{stockAgeLabel(row.ageDays)}</strong>{row.ageApproximate ? <small className={styles.estimatedLabel}>Estimado</small> : null}</td><td data-label="Valor inmovilizado"><strong>{money(row.immobilizedValue)}</strong></td></tr><tr className={styles.analyticsMobileDetails}><td colSpan={7}><details><summary>Ver fechas de ingreso</summary><dl><div><dt>Primer ingreso conocido</dt><dd>{formatKnownDate(row.firstKnownStockAt, row.firstKnownStockApproximate)}</dd></div><div><dt>Última reposición</dt><dd>{formatKnownDate(row.lastRestockAt, false)}</dd></div></dl></details></td></tr></>;
}

function AnalyticsSortableTh({ label, sortKey, activeKey, direction, onSort }: { label: string; sortKey: AnalyticsSortKey; activeKey: AnalyticsSortKey; direction: SortDirection; onSort: (key: AnalyticsSortKey) => void }) {
  const active = sortKey === activeKey;
  return <th aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}><button type="button" onClick={() => onSort(sortKey)}>{label}{active ? <span aria-hidden="true"> {direction === "asc" ? "↑" : "↓"}</span> : null}</button></th>;
}

function Help({ text }: { text: string }) {
  return <span className={styles.help} title={text} tabIndex={0} aria-label={text}>?</span>;
}

function AnalyticsSkeleton() {
  return <div className={styles.analyticsSkeleton} role="status"><span>Cargando analítica de stock…</span></div>;
}

function formatKnownDate(value?: string | null, estimated = false, empty = "Sin información") {
  if (!value) return empty;
  const date = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  return estimated ? `${date} (estimado)` : date;
}

function stockAgeLabel(days?: number | null) {
  if (days === null || days === undefined) return "Sin información";
  if (days < 30) return `${days} ${days === 1 ? "día" : "días"}`;
  if (days < 365) {
    const months = Math.max(1, Math.floor(days / 30));
    return `${months} ${months === 1 ? "mes" : "meses"}`;
  }
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  return `${years} ${years === 1 ? "año" : "años"}${months ? ` y ${months} ${months === 1 ? "mes" : "meses"}` : ""}`;
}

function readUrlParam(name: string) {
  return typeof window === "undefined" ? "" : new URL(window.location.href).searchParams.get(name) ?? "";
}

function setOrDelete(params: URLSearchParams, name: string, value: string) {
  if (value) params.set(name, value);
  else params.delete(name);
}

function normalizeQuickFilter(value: string): AnalyticsQuickFilter {
  return quickFilters.some((filter) => filter.value === value) ? value as AnalyticsQuickFilter : "";
}

function normalizeAnalyticsSort(value: string): AnalyticsSortKey {
  return ["ageDays", "lastSaleAt", "immobilizedValue"].includes(value) ? value as AnalyticsSortKey : "ageDays";
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
const analyticsLeadStyle: React.CSSProperties = { margin: "7px 0 0", maxWidth: 650, color: "var(--account-text-muted)", lineHeight: 1.45 };
const statsStyle: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };
const tabsStyle: React.CSSProperties = { display: "flex", gap: 8, borderBottom: "1px solid var(--account-item-border)", paddingBottom: 8 };
const tabButtonStyle = (active: boolean): React.CSSProperties => ({ minHeight: 40, border: "1px solid var(--account-item-border)", borderRadius: 12, background: active ? "var(--account-item-bg-active)" : "var(--account-sidebar-bg)", color: "var(--account-text-strong)", fontWeight: 800, padding: "0 16px", cursor: "pointer" });
const statStyle: React.CSSProperties = { minWidth: 116, border: "1px solid var(--account-item-border)", borderRadius: 14, background: "var(--account-item-bg)", padding: "10px 12px", display: "grid", gap: 4 };
const panelGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(220px, 280px) minmax(0, 1fr)", gap: 16, alignItems: "start" };
const filtersStyle: React.CSSProperties = { border: "1px solid var(--account-item-border)", borderRadius: 18, background: "var(--account-item-bg)", padding: 16, display: "grid", gap: 12 };
const fieldStyle: React.CSSProperties = { display: "grid", gap: 6, color: "var(--account-text-muted)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" };
const inputStyle: React.CSSProperties = { width: "100%", minHeight: 40, border: "1px solid var(--account-item-border)", borderRadius: 12, background: "var(--account-sidebar-bg)", color: "var(--account-text-strong)", padding: "0 12px", font: "inherit" };
const compactSelectStyle: React.CSSProperties = { ...inputStyle, minWidth: 140, minHeight: 34 };
const inventoryBulkStyle: React.CSSProperties = { minWidth: 960, padding: 12, borderBottom: "1px solid var(--account-item-border)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", color: "var(--account-text-strong)" };
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
const exportButtonStyle: React.CSSProperties = { ...ghostButtonStyle, minHeight: 34, padding: "0 11px", fontSize: 13 };
const inlineButtonStyle: React.CSSProperties = { border: 0, padding: 0, background: "transparent", color: "inherit", font: "inherit", fontWeight: 800, textDecoration: "underline", cursor: "pointer" };
const noticeStyle: React.CSSProperties = { border: "1px solid var(--account-item-border)", borderRadius: 14, background: "var(--account-item-bg)", color: "var(--account-text-strong)", padding: "12px 14px" };
const mutedStyle: React.CSSProperties = { color: "var(--account-text-muted)" };
const modalOverlayStyle: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.42)", display: "grid", placeItems: "center", padding: 16 };
const modalStyle: React.CSSProperties = { width: "min(520px, 100%)", border: "1px solid var(--account-item-border)", borderRadius: 20, background: "var(--account-sidebar-bg)", boxShadow: "var(--admin-modal-shadow)", padding: 20, display: "grid", gap: 16 };
const modalHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 14, alignItems: "start" };
const modalTitleStyle: React.CSSProperties = { margin: "0 0 4px", color: "var(--account-text-strong)", fontSize: 22 };
const iconButtonStyle: React.CSSProperties = { width: 36, height: 36, borderRadius: 999, border: "1px solid var(--account-item-border)", background: "var(--account-item-bg)", color: "var(--account-text-strong)", cursor: "pointer", fontWeight: 900 };
const currentStockStyle: React.CSSProperties = { border: "1px solid var(--account-item-border)", borderRadius: 16, background: "var(--account-item-bg)", padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--account-text-strong)" };
const modalActionsStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 };
