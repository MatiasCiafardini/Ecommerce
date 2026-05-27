"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiUrl } from "@/lib/config";

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
type Template = {
  key: string;
  name: string;
  page: { widthMm: number; heightMm: number };
  label: { widthMm: number; heightMm: number; paddingMm: number };
  grid: { columns: number; rows: number };
};
type LabelOptions = {
  showPrice: boolean;
  showStoreName: boolean;
  showProductName: boolean;
  showVariantName: boolean;
  showSku: boolean;
  showLogo: boolean;
};
type PreviewLabel = Omit<VariantRow, "id" | "price"> & {
  id: string;
  storeName: string;
  price: string;
  logoUrl?: string | null;
  barcodeSvg: string;
};
type Preview = {
  template: Template;
  options: LabelOptions;
  totalLabels: number;
  labels: PreviewLabel[];
};

const apiUrl = getApiUrl();
const storageKey = "labels-wizard-state-v1";
const defaultOptions: LabelOptions = {
  showPrice: true,
  showStoreName: true,
  showProductName: true,
  showVariantName: true,
  showSku: true,
  showLogo: false,
};
const optionLabels: Record<keyof LabelOptions, string> = {
  showPrice: "Mostrar precio",
  showStoreName: "Mostrar tienda",
  showProductName: "Mostrar producto",
  showVariantName: "Mostrar variante",
  showSku: "Mostrar SKU",
  showLogo: "Mostrar logo",
};
type Toast = { type: "success" | "error" | "info"; message: string };

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(payload: unknown) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: string | string[] }).message;
    return Array.isArray(message) ? message.join(", ") : message || "No se pudo completar la accion.";
  }
  return typeof payload === "string" ? payload : "No se pudo completar la accion.";
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

function variantLabel(row: Pick<VariantRow, "productName" | "variantName">) {
  return [row.productName, row.variantName].filter(Boolean).join(" - ");
}

function getReferrerOrigin() {
  if (typeof document === "undefined" || !document.referrer) return null;
  try {
    return new URL(document.referrer).origin;
  } catch {
    return null;
  }
}

function resolveProductImageUrl(imageUrl: string | null) {
  if (!imageUrl) return null;
  if (/^(https?:|data:|blob:)/u.test(imageUrl)) return imageUrl;

  if (imageUrl.startsWith("/uploads")) {
    try {
      return `${new URL(apiUrl).origin}${imageUrl}`;
    } catch {
      return imageUrl;
    }
  }

  if (imageUrl.startsWith("/images")) {
    const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL?.trim() || getReferrerOrigin() || "http://localhost:3001";
    return `${storefrontUrl.replace(/\/$/u, "")}${imageUrl}`;
  }

  return imageUrl;
}

function ProductThumb({ row }: { row: VariantRow }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : resolveProductImageUrl(row.imageUrl);

  if (!src) return <span className="image-empty" />;
  return <img src={src} alt="" onError={() => setFailed(true)} />;
}

export default function LabelsPage() {
  const [storeId, setStoreId] = useState("");
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Record<number, VariantRow>>({});
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [templateKey, setTemplateKey] = useState("A4_50x25");
  const [options, setOptions] = useState<LabelOptions>(defaultOptions);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ search: "", sku: "", name: "", categoryId: "", stockOnly: false, activeOnly: true });
  const [loading, setLoading] = useState(false);
  const [baseLoading, setBaseLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const selectedRows = useMemo(() => Object.values(selected), [selected]);
  const items = useMemo(
    () => selectedRows.map((row) => ({ variantId: row.id, quantity: quantities[row.id] ?? row.stock ?? 1 })),
    [quantities, selectedRows],
  );
  const totalLabels = useMemo(() => items.reduce((total, item) => total + Math.max(0, item.quantity), 0), [items]);
  const missingSkuRows = useMemo(() => selectedRows.filter((row) => !row.sku?.trim()), [selectedRows]);
  const invalidQuantityRows = useMemo(
    () => selectedRows.filter((row) => !Number.isInteger(quantities[row.id]) || (quantities[row.id] ?? 0) <= 0),
    [quantities, selectedRows],
  );
  const hasTemplate = useMemo(() => templates.some((template) => template.key === templateKey), [templateKey, templates]);
  const canGenerate = selectedRows.length > 0 && missingSkuRows.length === 0 && invalidQuantityRows.length === 0 && hasTemplate;
  const canDownload = canGenerate && Boolean(preview) && !downloading;
  const validationMessage = useMemo(() => {
    if (selectedRows.length === 0) return "Selecciona al menos una variante.";
    if (missingSkuRows.length > 0) return `Hay ${missingSkuRows.length} variante(s) sin SKU. Completa el SKU antes de generar etiquetas.`;
    if (invalidQuantityRows.length > 0) return "Todas las cantidades deben ser numeros enteros mayores a 0.";
    if (!hasTemplate) return "Selecciona una plantilla.";
    return null;
  }, [hasTemplate, invalidQuantityRows.length, missingSkuRows.length, selectedRows.length]);

  function showToast(type: Toast["type"], message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 4200);
  }

  async function request<T>(path: string, init?: RequestInit) {
    const response = await fetch(`${apiUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        ...(init?.headers ?? {}),
        "x-store-id": storeId,
      },
    });
    const payload = await readJson(response);
    if (!response.ok) throw new Error(errorMessage(payload));
    return payload as T;
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialStoreId = params.get("storeId") ?? window.localStorage.getItem("admin-store-id") ?? "";
    setStoreId(initialStoreId);
    const saved = window.sessionStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { selected?: Record<number, VariantRow>; quantities?: Record<number, number>; templateKey?: string; options?: LabelOptions };
        setSelected(parsed.selected ?? {});
        setQuantities(parsed.quantities ?? {});
        setTemplateKey(parsed.templateKey ?? "A4_50x25");
        setOptions(parsed.options ?? defaultOptions);
      } catch {
        window.sessionStorage.removeItem(storageKey);
      }
    }
  }, []);

  useEffect(() => {
    if (!storeId) return;
    window.localStorage.setItem("admin-store-id", storeId);
  }, [storeId]);

  useEffect(() => {
    window.sessionStorage.setItem(storageKey, JSON.stringify({ selected, quantities, templateKey, options }));
  }, [selected, quantities, templateKey, options]);

  useEffect(() => {
    setPreview(null);
  }, [selected, quantities, templateKey, options]);

  useEffect(() => {
    if (!storeId) return;
    setBaseLoading(true);
    Promise.all([
      request<Template[]>("/admin/labels/templates", { cache: "no-store" }),
      request<Category[]>("/categories", { cache: "no-store" }),
    ])
      .then(([nextTemplates, nextCategories]) => {
        setTemplates(nextTemplates);
        setCategories(nextCategories);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "No se pudieron cargar los datos base.";
        setNotice(message);
        showToast("error", message);
      })
      .finally(() => setBaseLoading(false));
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    loadRows().catch((error) => {
      const message = error instanceof Error ? error.message : "No se pudieron cargar variantes.";
      setNotice(message);
      showToast("error", message);
    });
  }, [storeId, page]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const variantIds = params.get("variantIds");
    const productId = params.get("productId");
    if (!storeId || (!variantIds && !productId)) return;

    const query = variantIds ? `variantIds=${encodeURIComponent(variantIds)}` : `productId=${encodeURIComponent(productId ?? "")}`;
    request<{ items: VariantRow[] }>(`/admin/labels/products?limit=100&activeOnly=false&${query}`, { cache: "no-store" })
      .then((payload) => {
        if (payload.items.length === 0) return;
        setSelected((current) => ({ ...current, ...Object.fromEntries(payload.items.map((row) => [row.id, row])) }));
        setQuantities((current) => ({
          ...current,
          ...Object.fromEntries(payload.items.map((row) => [row.id, Math.max(1, row.stock)])),
        }));
      })
      .catch((error) => setNotice(error instanceof Error ? error.message : "No se pudo preseleccionar."));
  }, [storeId]);

  async function loadRows(nextPage = page) {
    setLoading(true);
    setNotice(null);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: "20",
        activeOnly: String(filters.activeOnly),
        stockOnly: String(filters.stockOnly),
      });
      if (filters.search) params.set("search", filters.search);
      if (filters.sku) params.set("sku", filters.sku);
      if (filters.name) params.set("name", filters.name);
      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      const payload = await request<{ items: VariantRow[]; totalPages: number }>(`/admin/labels/products?${params}`, { cache: "no-store" });
      setRows(payload.items);
      setTotalPages(payload.totalPages);
    } finally {
      setLoading(false);
    }
  }

  function toggle(row: VariantRow) {
    setSelected((current) => {
      const next = { ...current };
      if (next[row.id]) {
        delete next[row.id];
      } else {
        next[row.id] = row;
        setQuantities((currentQuantities) => ({ ...currentQuantities, [row.id]: Math.max(1, row.stock) }));
      }
      return next;
    });
  }

  function setAllQuantity(mode: "stock" | "one" | "clear") {
    setQuantities((current) => {
      const next = { ...current };
      selectedRows.forEach((row) => {
        next[row.id] = mode === "stock" ? Math.max(0, row.stock) : mode === "one" ? 1 : 0;
      });
      return next;
    });
  }

  async function generatePreview() {
    if (!canGenerate) {
      const message = validationMessage ?? "Revisa la seleccion antes de generar.";
      setNotice(message);
      showToast("error", message);
      return;
    }
    setLoading(true);
    setNotice(null);
    try {
      const payload = await request<Preview>("/admin/labels/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, template: templateKey, options }),
      });
      setPreview(payload);
      setStep(4);
      showToast("success", "Preview generada con codigos Code128 reales.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo generar la preview.";
      setNotice(message);
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf() {
    if (!canGenerate) {
      const message = validationMessage ?? "Revisa la seleccion antes de descargar.";
      setNotice(message);
      showToast("error", message);
      return;
    }
    setDownloading(true);
    setNotice(null);
    try {
      const response = await fetch(`${apiUrl}/admin/labels/pdf`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-store-id": storeId },
        body: JSON.stringify({ items, template: templateKey, options }),
      });
      if (!response.ok) throw new Error(errorMessage(await readJson(response)));
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `etiquetas-${templateKey.toLowerCase()}.pdf`;
      anchor.click();
      URL.revokeObjectURL(href);
      showToast("success", "PDF generado. Imprimilo al 100%, sin ajustar a pagina.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo descargar el PDF.";
      setNotice(message);
      showToast("error", message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="admin-shell labels-shell">
      <section className="labels-toolbar">
        <div>
          <p className="eyebrow">Gestion</p>
          <h1>Etiquetas</h1>
        </div>
        <label className="field store-id-field">
          <span>Store ID</span>
          <input value={storeId} onChange={(event) => setStoreId(event.target.value.replace(/\D/g, ""))} placeholder="Ej. 1" />
        </label>
      </section>

      <section className="panel labels-workspace">
        {toast ? <div className={`labels-toast ${toast.type}`}>{toast.message}</div> : null}
        {notice ? <div className="banner error">{notice}</div> : null}
        {validationMessage && (step > 1 || missingSkuRows.length > 0) ? <div className="labels-validation">{validationMessage}</div> : null}
        <div className="label-stepper">
          {["Variantes", "Cantidades", "Plantilla", "Preview"].map((label, index) => (
            <button key={label} className={`label-step${step === index + 1 ? " active" : ""}`} onClick={() => setStep(index + 1)}>
              <span>{index + 1}</span>
              {label}
            </button>
          ))}
        </div>

        {step === 1 ? (
          <div className="labels-panel-grid">
            <div className="labels-filters">
              <label className="field">
                <span>Buscador</span>
                <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Nombre, SKU o variante" />
              </label>
              <label className="field">
                <span>SKU</span>
                <input value={filters.sku} onChange={(event) => setFilters({ ...filters, sku: event.target.value })} />
              </label>
              <label className="field">
                <span>Nombre</span>
                <input value={filters.name} onChange={(event) => setFilters({ ...filters, name: event.target.value })} />
              </label>
              <label className="field">
                <span>Categoria</span>
                <select value={filters.categoryId} onChange={(event) => setFilters({ ...filters, categoryId: event.target.value })}>
                  <option value="">Todas</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label className="check-inline"><input type="checkbox" checked={filters.stockOnly} onChange={(event) => setFilters({ ...filters, stockOnly: event.target.checked })} /> Stock &gt; 0</label>
              <label className="check-inline"><input type="checkbox" checked={filters.activeOnly} onChange={(event) => setFilters({ ...filters, activeOnly: event.target.checked })} /> Solo activas</label>
              <button className="primary-button" disabled={!storeId || loading} onClick={() => { setPage(1); loadRows(1).catch((error) => { setNotice(error.message); showToast("error", error.message); }); }}>
                {loading ? "Buscando..." : "Aplicar filtros"}
              </button>
            </div>
            <div className="label-table-wrap">
              <table className="label-table">
                <thead><tr><th></th><th>Producto</th><th>Variante</th><th>SKU</th><th>Stock</th><th>Precio</th></tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="label-loading-row">Cargando variantes...</td></tr>
                  ) : null}
                  {!loading && rows.length === 0 ? (
                    <tr><td colSpan={6} className="label-loading-row">No hay variantes para estos filtros.</td></tr>
                  ) : null}
                  {!loading && rows.map((row) => (
                    <tr key={row.id}>
                      <td><input type="checkbox" checked={Boolean(selected[row.id])} onChange={() => toggle(row)} /></td>
                      <td><div className="product-cell"><ProductThumb row={row} /><strong>{row.productName}</strong></div></td>
                      <td>{row.variantName || "Unica"}</td>
                      <td>{row.sku?.trim() ? <code>{row.sku}</code> : <span className="sku-missing">Sin SKU</span>}</td>
                      <td>{row.stock}</td>
                      <td>{formatMoney(row.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pagination-row">
                <button className="ghost-button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
                <span>Pagina {page} de {totalPages}</span>
                <button className="ghost-button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente</button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="label-table-wrap">
            <div className="quick-actions">
              <button className="ghost-button" onClick={() => setAllQuantity("stock")}>Usar stock</button>
              <button className="ghost-button" onClick={() => setAllQuantity("one")}>Todas en 1</button>
              <button className="ghost-button" onClick={() => setAllQuantity("clear")}>Limpiar</button>
            </div>
            <table className="label-table">
              <thead><tr><th>Producto</th><th>SKU</th><th>Stock</th><th>Cantidad etiquetas</th></tr></thead>
              <tbody>
                {selectedRows.map((row) => (
                  <tr key={row.id}>
                    <td>{variantLabel(row)}</td>
                    <td>{row.sku?.trim() ? <code>{row.sku}</code> : <span className="sku-missing">Sin SKU</span>}</td>
                    <td>{row.stock}</td>
                    <td><input className="quantity-input" type="number" min={0} step={1} value={quantities[row.id] ?? 0} onChange={(event) => setQuantities({ ...quantities, [row.id]: Math.max(0, Math.floor(Number(event.target.value) || 0)) })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="template-grid">
            {baseLoading && templates.length === 0 ? <div className="label-loading-row template-loading">Cargando plantillas...</div> : null}
            {templates.map((template) => (
              <button key={template.key} className={`template-card${templateKey === template.key ? " selected" : ""}`} onClick={() => setTemplateKey(template.key)}>
                <strong>{template.name}</strong>
                <span>{template.label.widthMm} x {template.label.heightMm} mm</span>
                <small>{template.grid.columns} columnas x {template.grid.rows} filas</small>
              </button>
            ))}
            <div className="options-panel">
              {Object.keys(defaultOptions).map((key) => (
                <label key={key} className="check-inline">
                  <input type="checkbox" checked={options[key as keyof LabelOptions]} onChange={(event) => setOptions({ ...options, [key]: event.target.checked })} />
                  {optionLabels[key as keyof LabelOptions]}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="preview-layout">
            <div className="preview-meta">
              <div className="preview-badges">
                <span className="pill">{totalLabels} etiquetas</span>
                <span className="print-notice">Imprimir al 100%, no ajustar a pagina</span>
              </div>
              <button className="primary-button" disabled={!canDownload} onClick={downloadPdf}>{downloading ? "Generando..." : "Descargar PDF"}</button>
            </div>
            <div className="label-preview-grid">
              {(preview?.labels ?? []).map((label) => (
                <div key={label.id} className="label-preview-card">
                  {preview?.options.showLogo ? (
                    label.logoUrl ? (
                      <img className="label-logo" src={resolveProductImageUrl(label.logoUrl) ?? label.logoUrl} alt={label.storeName} />
                    ) : (
                      <strong className="label-logo-text">{label.storeName}</strong>
                    )
                  ) : null}
                  {preview?.options.showStoreName ? <strong>{label.storeName}</strong> : null}
                  {preview?.options.showProductName ? <span>{label.productName}</span> : null}
                  {preview?.options.showVariantName ? <span>{label.variantName}</span> : null}
                  {preview?.options.showPrice ? <b>{label.price}</b> : null}
                  <div className="barcode" dangerouslySetInnerHTML={{ __html: label.barcodeSvg }} />
                  {preview?.options.showSku ? <code>{label.sku}</code> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="wizard-actions">
          <button className="ghost-button" disabled={step <= 1} onClick={() => setStep(step - 1)}>Atras</button>
          {step < 3 ? <button className="primary-button" disabled={step === 1 ? selectedRows.length === 0 || missingSkuRows.length > 0 : invalidQuantityRows.length > 0 || missingSkuRows.length > 0} onClick={() => setStep(step + 1)}>Continuar</button> : null}
          {step === 3 ? <button className="primary-button" disabled={!canGenerate || loading} onClick={generatePreview}>{loading ? "Generando..." : "Ver preview"}</button> : null}
        </div>
      </section>
    </main>
  );
}
