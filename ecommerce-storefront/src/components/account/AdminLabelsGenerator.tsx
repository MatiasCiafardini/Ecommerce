"use client";

import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { api, apiBlob } from "@/lib/api";
import { getPublicApiUrl } from "@/lib/runtime-config";

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
type PreviewLabel = {
  id: string;
  productName: string;
  variantName: string;
  sku: string;
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
type Toast = { type: "success" | "error" | "info"; message: string };

const storageKey = "labels-wizard-state-v2";
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

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function variantLabel(row: Pick<VariantRow, "productName" | "variantName">) {
  return [row.productName, row.variantName].filter(Boolean).join(" - ");
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

function resolveLabelLogoUrl(label: Pick<PreviewLabel, "logoUrl" | "storeName">) {
  if (label.logoUrl) {
    return resolveImageUrl(label.logoUrl);
  }

  const storeName = label.storeName.trim().toLowerCase();
  if (storeName.includes("trojani")) return "/images/trojani/logo_trojani_recortado.png";
  if (storeName.includes("mi maria")) return "/images/mimaria/logo.png";
  if (storeName.includes("mila")) return "/images/milashoes/logo.jpg";
  if (storeName.includes("libreria")) return "/images/libreria/logo_solja_transparente.png";
  if (storeName.includes("como vos")) return "/images/comovosyyo/logo.png";

  return null;
}

function ProductThumb({ row }: { row: VariantRow }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : resolveImageUrl(row.imageUrl);

  if (!src) return <span style={styles.imageEmpty} />;
  return <img src={src} alt="" onError={() => setFailed(true)} style={styles.productImage} />;
}

function LabelLogo({ label }: { label: PreviewLabel }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : resolveLabelLogoUrl(label);

  if (!src) return <strong style={styles.logoText}>{label.storeName}</strong>;
  return <img style={styles.labelLogo} src={src} alt={label.storeName} onError={() => setFailed(true)} />;
}

export default function AdminLabelsGenerator() {
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
  const [filteredSelectionIds, setFilteredSelectionIds] = useState<Set<number> | null>(null);
  const [filters, setFilters] = useState({
    search: "",
    sku: "",
    name: "",
    categoryId: "",
    stockOnly: false,
    activeOnly: true,
  });
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadingBase, setLoadingBase] = useState(false);
  const [selectingFiltered, setSelectingFiltered] = useState(false);
  const [generatingPreview, setGeneratingPreview] = useState(false);
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
  const hasTemplate = templates.some((template) => template.key === templateKey);
  const allFilteredSelected = Boolean(
    filteredSelectionIds?.size &&
      [...filteredSelectionIds].every((id) => Boolean(selected[id])),
  );
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

  useEffect(() => {
    const saved = window.sessionStorage.getItem(storageKey);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as {
        selected?: Record<number, VariantRow>;
        quantities?: Record<number, number>;
        templateKey?: string;
        options?: LabelOptions;
      };
      setSelected(parsed.selected ?? {});
      setQuantities(parsed.quantities ?? {});
      setTemplateKey(parsed.templateKey ?? "A4_50x25");
      setOptions(parsed.options ?? defaultOptions);
    } catch {
      window.sessionStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(storageKey, JSON.stringify({ selected, quantities, templateKey, options }));
  }, [selected, quantities, templateKey, options]);

  useEffect(() => {
    setPreview(null);
  }, [selected, quantities, templateKey, options]);

  useEffect(() => {
    setFilteredSelectionIds(null);
  }, [filters]);

  useEffect(() => {
    setLoadingBase(true);
    Promise.all([
      api("/admin/labels/templates") as Promise<Template[]>,
      api("/categories") as Promise<Category[]>,
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
      .finally(() => setLoadingBase(false));
  }, []);

  useEffect(() => {
    void loadRows();
  }, [page]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const variantIds = params.get("variantIds");
    const productId = params.get("productId");
    if (!variantIds && !productId) return;

    const query = variantIds ? `variantIds=${encodeURIComponent(variantIds)}` : `productId=${encodeURIComponent(productId ?? "")}`;
    api(`/admin/labels/products?limit=100&activeOnly=false&${query}`)
      .then((payload) => {
        const itemsPayload = (payload as { items: VariantRow[] }).items;
        if (itemsPayload.length === 0) return;
        setSelected((current) => ({ ...current, ...Object.fromEntries(itemsPayload.map((row) => [row.id, row])) }));
        setQuantities((current) => ({
          ...current,
          ...Object.fromEntries(itemsPayload.map((row) => [row.id, Math.max(1, row.stock)])),
        }));
      })
      .catch((error) => setNotice(error instanceof Error ? error.message : "No se pudo preseleccionar."));
  }, []);

  function buildProductsParams(nextPage: number, limit: number) {
    const params = new URLSearchParams({
      page: String(nextPage),
      limit: String(limit),
      activeOnly: String(filters.activeOnly),
      stockOnly: String(filters.stockOnly),
    });
    if (filters.search) params.set("search", filters.search);
    if (filters.sku) params.set("sku", filters.sku);
    if (filters.name) params.set("name", filters.name);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    return params;
  }

  async function loadRows(nextPage = page) {
    setLoadingRows(true);
    setNotice(null);
    try {
      const payload = await api(`/admin/labels/products?${buildProductsParams(nextPage, 20)}`) as { items: VariantRow[]; totalPages: number };
      setRows(payload.items);
      setTotalPages(payload.totalPages);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar variantes.";
      setNotice(message);
      showToast("error", message);
    } finally {
      setLoadingRows(false);
    }
  }

  async function loadAllFilteredRows() {
    const firstPage = await api(`/admin/labels/products?${buildProductsParams(1, 100)}`) as { items: VariantRow[]; totalPages: number };
    const pages = [firstPage];

    for (let nextPage = 2; nextPage <= firstPage.totalPages; nextPage += 1) {
      pages.push(await api(`/admin/labels/products?${buildProductsParams(nextPage, 100)}`) as { items: VariantRow[]; totalPages: number });
    }

    return pages.flatMap((payload) => payload.items);
  }

  async function toggleAllFiltered() {
    setSelectingFiltered(true);
    setNotice(null);
    try {
      if (allFilteredSelected && filteredSelectionIds) {
        setSelected((current) => {
          const next = { ...current };
          filteredSelectionIds.forEach((id) => delete next[id]);
          return next;
        });
        setQuantities((current) => {
          const next = { ...current };
          filteredSelectionIds.forEach((id) => delete next[id]);
          return next;
        });
        const removedCount = filteredSelectionIds.size;
        setFilteredSelectionIds(null);
        showToast("info", `${removedCount} variante(s) filtrada(s) quitada(s).`);
        return;
      }

      const filteredRows = await loadAllFilteredRows();
      setSelected((current) => ({ ...current, ...Object.fromEntries(filteredRows.map((row) => [row.id, row])) }));
      setQuantities((current) => ({
        ...current,
        ...Object.fromEntries(filteredRows.map((row) => [row.id, current[row.id] ?? Math.max(1, row.stock)])),
      }));
      setFilteredSelectionIds(new Set(filteredRows.map((row) => row.id)));
      showToast("success", `${filteredRows.length} variante(s) filtrada(s) seleccionada(s).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron seleccionar los filtrados.";
      setNotice(message);
      showToast("error", message);
    } finally {
      setSelectingFiltered(false);
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

    setGeneratingPreview(true);
    setNotice(null);
    try {
      const payload = await api("/admin/labels/preview", {
        method: "POST",
        body: JSON.stringify({ items, template: templateKey, options }),
      }) as Preview;
      setPreview(payload);
      setStep(4);
      showToast("success", "Preview generada con codigos Code128 reales.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo generar la preview.";
      setNotice(message);
      showToast("error", message);
    } finally {
      setGeneratingPreview(false);
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
      const blob = await apiBlob("/admin/labels/pdf", {
        method: "POST",
        body: JSON.stringify({ items, template: templateKey, options }),
      });
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
    <section style={styles.shell}>
      <header style={styles.toolbar}>
        <div>
          <p style={styles.eyebrow}>Gestion</p>
          <h2 style={styles.title}>Etiquetas</h2>
        </div>
      </header>

      {toast ? <div style={{ ...styles.toast, ...toastToneStyle(toast.type) }}>{toast.message}</div> : null}
      {notice ? <div style={styles.errorBox}>{notice}</div> : null}
      {validationMessage && (step > 1 || missingSkuRows.length > 0) ? <div style={styles.validation}>{validationMessage}</div> : null}

      <div style={styles.stepper}>
        {["Variantes", "Cantidades", "Plantilla", "Preview"].map((label, index) => (
          <button key={label} type="button" style={stepButtonStyle(step === index + 1)} onClick={() => setStep(index + 1)}>
            <span style={stepNumberStyle(step === index + 1)}>{index + 1}</span>
            {label}
          </button>
        ))}
      </div>

      {step === 1 ? (
        <div style={styles.panelGrid}>
          <aside style={styles.filters}>
            <Field label="Buscador">
              <input style={styles.input} value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Nombre, SKU o variante" />
            </Field>
            <Field label="SKU">
              <input style={styles.input} value={filters.sku} onChange={(event) => setFilters({ ...filters, sku: event.target.value })} />
            </Field>
            <Field label="Nombre">
              <input style={styles.input} value={filters.name} onChange={(event) => setFilters({ ...filters, name: event.target.value })} />
            </Field>
            <Field label="Categoria">
              <select style={styles.input} value={filters.categoryId} onChange={(event) => setFilters({ ...filters, categoryId: event.target.value })}>
                <option value="">Todas</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </Field>
            <label style={styles.check}><input type="checkbox" checked={filters.stockOnly} onChange={(event) => setFilters({ ...filters, stockOnly: event.target.checked })} /> Stock &gt; 0</label>
            <label style={styles.check}><input type="checkbox" checked={filters.activeOnly} onChange={(event) => setFilters({ ...filters, activeOnly: event.target.checked })} /> Solo activas</label>
            <button type="button" style={primaryButtonStyle} disabled={loadingRows} onClick={() => { setPage(1); void loadRows(1); }}>
              {loadingRows ? "Buscando..." : "Aplicar filtros"}
            </button>
            <button type="button" style={ghostButtonStyle} disabled={loadingRows || selectingFiltered} onClick={() => void toggleAllFiltered()}>
              {selectingFiltered ? "Procesando..." : allFilteredSelected ? "Quitar filtrados" : "Seleccionar todos los filtrados"}
            </button>
          </aside>

          <TableWrap>
            <table style={styles.table}>
              <thead><tr><Th /><Th>Producto</Th><Th>Variante</Th><Th>SKU</Th><Th>Stock</Th><Th>Precio</Th></tr></thead>
              <tbody>
                {loadingRows ? <StateRow colSpan={6} label="Cargando variantes..." /> : null}
                {!loadingRows && rows.length === 0 ? <StateRow colSpan={6} label="No hay variantes para estos filtros." /> : null}
                {!loadingRows && rows.map((row) => (
                  <tr key={row.id} onClick={() => toggle(row)} style={selectableRowStyle(Boolean(selected[row.id]))}>
                    <Td><input type="checkbox" checked={Boolean(selected[row.id])} onClick={(event) => event.stopPropagation()} onChange={() => toggle(row)} /></Td>
                    <Td><div style={styles.productCell}><ProductThumb row={row} /><strong>{row.productName}</strong></div></Td>
                    <Td>{row.variantName || "Unica"}</Td>
                    <Td>{row.sku?.trim() ? <code>{row.sku}</code> : <span style={styles.skuMissing}>Sin SKU</span>}</Td>
                    <Td>{row.stock}</Td>
                    <Td>{formatMoney(row.price)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={styles.pagination}>
              <button type="button" style={ghostButtonStyle} disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
              <span>Pagina {page} de {totalPages}</span>
              <button type="button" style={ghostButtonStyle} disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente</button>
            </div>
          </TableWrap>
        </div>
      ) : null}

      {step === 2 ? (
        <TableWrap>
          <div style={styles.quickActions}>
            <button type="button" style={ghostButtonStyle} onClick={() => setAllQuantity("stock")}>Usar stock</button>
            <button type="button" style={ghostButtonStyle} onClick={() => setAllQuantity("one")}>Todas en 1</button>
            <button type="button" style={ghostButtonStyle} onClick={() => setAllQuantity("clear")}>Limpiar</button>
          </div>
          <table style={styles.table}>
            <thead><tr><Th>Producto</Th><Th>SKU</Th><Th>Stock</Th><Th>Cantidad etiquetas</Th></tr></thead>
            <tbody>
              {selectedRows.map((row) => (
                <tr key={row.id}>
                  <Td>{variantLabel(row)}</Td>
                  <Td>{row.sku?.trim() ? <code>{row.sku}</code> : <span style={styles.skuMissing}>Sin SKU</span>}</Td>
                  <Td>{row.stock}</Td>
                  <Td><input style={styles.quantityInput} type="number" min={0} step={1} value={quantities[row.id] ?? 0} onChange={(event) => setQuantities({ ...quantities, [row.id]: Math.max(0, Math.floor(Number(event.target.value) || 0)) })} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : null}

      {step === 3 ? (
        <div style={styles.templateGrid}>
          {loadingBase && templates.length === 0 ? <div style={styles.stateRow}>Cargando plantillas...</div> : null}
          {templates.map((template) => (
            <button key={template.key} type="button" style={templateCardStyle(templateKey === template.key)} onClick={() => setTemplateKey(template.key)}>
              <strong>{template.name}</strong>
              <span>{template.label.widthMm} x {template.label.heightMm} mm</span>
              <small>{template.grid.columns} columnas x {template.grid.rows} filas</small>
            </button>
          ))}
          <div style={styles.optionsPanel}>
            {(Object.keys(defaultOptions) as Array<keyof LabelOptions>).map((key) => (
              <label key={key} style={styles.check}>
                <input type="checkbox" checked={options[key]} onChange={(event) => setOptions({ ...options, [key]: event.target.checked })} />
                {optionLabels[key]}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div style={styles.previewLayout}>
          <div style={styles.previewMeta}>
            <div style={styles.previewBadges}>
              <span style={styles.pill}>{totalLabels} etiquetas</span>
              <span style={styles.printNotice}>Imprimir al 100%, no ajustar a pagina</span>
            </div>
            <button type="button" style={primaryButtonStyle} disabled={!canDownload} onClick={downloadPdf}>{downloading ? "Generando..." : "Descargar PDF"}</button>
          </div>
          <div style={styles.previewGrid}>
            {(preview?.labels ?? []).map((label) => (
              <div key={label.id} className="admin-label-preview-card" style={styles.previewCard}>
                {preview?.options.showLogo ? (
                  <div className="admin-label-preview-logo">
                    <LabelLogo label={label} />
                  </div>
                ) : null}
                <div className="admin-label-preview-copy">
                  {preview?.options.showStoreName ? <strong title={label.storeName}>{label.storeName}</strong> : null}
                  {preview?.options.showProductName ? <span title={label.productName}>{label.productName}</span> : null}
                  {preview?.options.showVariantName ? <span title={label.variantName}>{label.variantName}</span> : null}
                  {preview?.options.showPrice ? <b title={label.price}>{label.price}</b> : null}
                </div>
                <div className="admin-label-preview-barcode" style={styles.barcode} dangerouslySetInnerHTML={{ __html: label.barcodeSvg }} />
                {preview?.options.showSku ? <code title={label.sku}>{label.sku}</code> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={styles.wizardActions}>
        <button type="button" style={ghostButtonStyle} disabled={step <= 1} onClick={() => setStep(step - 1)}>Atras</button>
        {step < 3 ? (
          <button type="button" style={primaryButtonStyle} disabled={step === 1 ? selectedRows.length === 0 || missingSkuRows.length > 0 : invalidQuantityRows.length > 0 || missingSkuRows.length > 0} onClick={() => setStep(step + 1)}>Continuar</button>
        ) : null}
        {step === 3 ? (
          <button type="button" style={primaryButtonStyle} disabled={!canGenerate || generatingPreview} onClick={generatePreview}>{generatingPreview ? "Generando..." : "Ver preview"}</button>
        ) : null}
      </div>
      <style jsx global>{`
        .admin-label-preview-card {
          font-family: Arial, Helvetica, sans-serif;
        }

        .admin-label-preview-logo {
          height: 22px;
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
          overflow: hidden;
          flex: 0 0 auto;
        }

        .admin-label-preview-copy {
          min-height: 0;
          display: grid;
          gap: 1px;
          align-content: start;
          overflow: hidden;
        }

        .admin-label-preview-card span,
        .admin-label-preview-card strong,
        .admin-label-preview-card b,
        .admin-label-preview-card code {
          display: block;
          min-width: 0;
          max-width: 100%;
          color: #111;
          overflow-wrap: anywhere;
          word-break: break-word;
          line-height: 1.05;
          letter-spacing: 0;
        }

        .admin-label-preview-card strong {
          font-size: 8px;
          font-weight: 700;
        }

        .admin-label-preview-card span {
          font-size: 7px;
          font-weight: 500;
        }

        .admin-label-preview-card b {
          font-size: 8px;
          font-weight: 700;
        }

        .admin-label-preview-card code {
          font-size: 7px;
          font-family: Arial, Helvetica, sans-serif;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 0 0 auto;
        }

        .admin-label-preview-barcode svg {
          width: 100%;
          height: 30px;
          display: block;
          flex: 0 0 auto;
        }
      `}</style>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={styles.field}><span>{label}</span>{children}</label>;
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return <div style={styles.tableWrap}>{children}</div>;
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th style={styles.th}>{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={styles.td}>{children}</td>;
}

function StateRow({ colSpan, label }: { colSpan: number; label: string }) {
  return <tr><td colSpan={colSpan} style={styles.stateCell}>{label}</td></tr>;
}

function stepButtonStyle(active: boolean): React.CSSProperties {
  return {
    flex: "1 1 160px",
    minHeight: 56,
    borderRadius: 16,
    border: active ? "1px solid var(--accent-strong)" : "1px solid var(--checkout-border)",
    background: active ? "var(--accent-strong)" : "var(--page-panel-strong-bg)",
    color: active ? "var(--accent-contrast)" : "var(--account-text-muted)",
    cursor: "pointer",
    textAlign: "left",
    padding: 12,
    boxShadow: active ? "0 10px 24px rgba(98, 55, 32, 0.16)" : "none",
  };
}

function stepNumberStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-grid",
    placeItems: "center",
    width: 26,
    height: 26,
    marginRight: 8,
    borderRadius: "50%",
    background: active ? "rgba(255,255,255,0.18)" : "rgba(109,64,40,0.1)",
    color: active ? "var(--accent-contrast)" : "var(--accent-strong)",
  };
}

function templateCardStyle(selected: boolean): React.CSSProperties {
  return {
    minHeight: 130,
    display: "grid",
    gap: 8,
    textAlign: "left",
    border: selected ? "1px solid rgba(109,64,40,0.5)" : "1px solid var(--checkout-border)",
    borderRadius: 20,
    background: selected ? "rgba(109,64,40,0.08)" : "var(--page-panel-strong-bg)",
    color: "var(--account-text-strong)",
    padding: 16,
    cursor: "pointer",
  };
}

function selectableRowStyle(selected: boolean): React.CSSProperties {
  return {
    cursor: "pointer",
    background: selected ? "rgba(109,64,40,0.06)" : "transparent",
  };
}

function toastToneStyle(type: Toast["type"]): React.CSSProperties {
  if (type === "success") return { color: "var(--admin-tone-success-color)", background: "var(--admin-tone-success-bg)", borderColor: "var(--admin-tone-success-border)" };
  if (type === "error") return { color: "var(--admin-danger-color)", background: "var(--admin-danger-bg)", borderColor: "var(--admin-danger-border)" };
  return { color: "var(--admin-tone-info-color)", background: "var(--admin-tone-info-bg)", borderColor: "var(--admin-tone-info-border)" };
}

const primaryButtonStyle: React.CSSProperties = {
  padding: "14px 18px",
  background: "var(--accent-strong)",
  color: "var(--accent-contrast)",
  border: "none",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 700,
};

const ghostButtonStyle: React.CSSProperties = {
  padding: "10px 14px",
  background: "transparent",
  color: "var(--account-text-strong)",
  border: "1px solid var(--checkout-border-strong)",
  borderRadius: 999,
  cursor: "pointer",
};

const styles = {
  shell: { display: "grid", gap: 20, width: "100%", minWidth: 0 } satisfies React.CSSProperties,
  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, borderBottom: "1px solid var(--checkout-border)", paddingBottom: 4, flexWrap: "wrap" } satisfies React.CSSProperties,
  eyebrow: { margin: 0, color: "var(--accent-strong)", letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 12 } satisfies React.CSSProperties,
  title: { margin: "8px 0 0", fontSize: "clamp(2rem, 4vw, 3.2rem)", lineHeight: 1 } satisfies React.CSSProperties,
  toast: {
    position: "fixed",
    right: 24,
    bottom: 24,
    zIndex: 80,
    maxWidth: "min(420px, calc(100vw - 32px))",
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid var(--checkout-border)",
    boxShadow: "0 18px 42px rgba(17, 17, 17, 0.14)",
  } satisfies React.CSSProperties,
  errorBox: { padding: "14px 16px", borderRadius: 16, color: "var(--admin-danger-color)", background: "var(--admin-danger-bg)" } satisfies React.CSSProperties,
  validation: { padding: "12px 14px", borderRadius: 14, border: "1px solid var(--admin-danger-border)", color: "var(--admin-danger-color)", background: "var(--admin-danger-bg)" } satisfies React.CSSProperties,
  stepper: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" } satisfies React.CSSProperties,
  panelGrid: { display: "grid", gridTemplateColumns: "minmax(240px, 300px) minmax(0, 1fr)", gap: 18, alignItems: "start" } satisfies React.CSSProperties,
  filters: { display: "grid", gap: 14, alignContent: "start", background: "var(--page-panel-strong-bg)", border: "1px solid var(--checkout-border)", borderRadius: 20, padding: 16 } satisfies React.CSSProperties,
  field: { display: "grid", gap: 8, color: "var(--account-text-muted)", fontSize: 14 } satisfies React.CSSProperties,
  input: { width: "100%", borderRadius: 16, color: "var(--account-text-strong)", padding: "14px 16px", background: "var(--muted-field-bg)", border: "1px solid var(--checkout-border)", outline: "none" } satisfies React.CSSProperties,
  check: { display: "flex", alignItems: "center", gap: 8, color: "var(--account-text-muted)", fontSize: 14 } satisfies React.CSSProperties,
  tableWrap: { minWidth: 0, overflowX: "auto" } satisfies React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse", minWidth: 760 } satisfies React.CSSProperties,
  th: { padding: 12, borderBottom: "1px solid var(--checkout-border)", textAlign: "left", verticalAlign: "middle", color: "var(--account-text-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" } satisfies React.CSSProperties,
  td: { padding: 12, borderBottom: "1px solid var(--checkout-border)", textAlign: "left", verticalAlign: "middle" } satisfies React.CSSProperties,
  stateCell: { padding: 22, textAlign: "center", color: "var(--account-text-muted)" } satisfies React.CSSProperties,
  stateRow: { gridColumn: "1 / -1", padding: 22, textAlign: "center", color: "var(--account-text-muted)", border: "1px solid var(--checkout-border)", borderRadius: 16 } satisfies React.CSSProperties,
  productCell: { display: "flex", alignItems: "center", gap: 12, minWidth: 220 } satisfies React.CSSProperties,
  productImage: { width: 42, height: 42, borderRadius: 10, objectFit: "cover", background: "var(--muted-field-bg)", border: "1px solid var(--checkout-border)", flex: "0 0 auto" } satisfies React.CSSProperties,
  imageEmpty: { width: 42, height: 42, borderRadius: 10, background: "var(--muted-field-bg)", border: "1px solid var(--checkout-border)", flex: "0 0 auto" } satisfies React.CSSProperties,
  skuMissing: { color: "var(--admin-danger-color)", fontWeight: 700 } satisfies React.CSSProperties,
  pagination: { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, paddingTop: 14, color: "var(--account-text-muted)" } satisfies React.CSSProperties,
  quickActions: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 } satisfies React.CSSProperties,
  quantityInput: { width: 110, borderRadius: 12, border: "1px solid var(--checkout-border)", background: "var(--muted-field-bg)", color: "var(--account-text-strong)", padding: 10 } satisfies React.CSSProperties,
  templateGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 } satisfies React.CSSProperties,
  optionsPanel: { gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, background: "var(--page-panel-strong-bg)", border: "1px solid var(--checkout-border)", borderRadius: 20, padding: 16 } satisfies React.CSSProperties,
  previewLayout: { display: "grid", gap: 18 } satisfies React.CSSProperties,
  previewMeta: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" } satisfies React.CSSProperties,
  previewBadges: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" } satisfies React.CSSProperties,
  pill: { display: "inline-flex", alignItems: "center", padding: "8px 12px", borderRadius: 999, background: "rgba(109,64,40,0.08)", color: "var(--accent-strong)" } satisfies React.CSSProperties,
  printNotice: { color: "var(--account-text-muted)", border: "1px solid var(--checkout-border)", borderRadius: 999, padding: "8px 12px" } satisfies React.CSSProperties,
  previewGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, maxHeight: 620, overflow: "auto", paddingRight: 4 } satisfies React.CSSProperties,
  previewCard: {
    height: 136,
    display: "flex",
    flexDirection: "column",
    gap: 3,
    padding: 10,
    background: "#fff",
    color: "#111",
    border: "1px dashed rgba(6,19,26,0.45)",
    borderRadius: 8,
    overflow: "hidden",
    textAlign: "left",
    lineHeight: 1.05,
  } satisfies React.CSSProperties,
  labelLogo: { width: "auto", maxWidth: 58, height: "auto", maxHeight: 20, objectFit: "contain", flex: "0 0 auto" } satisfies React.CSSProperties,
  logoText: { fontSize: 8, letterSpacing: 0, textTransform: "uppercase", justifySelf: "start", marginBottom: 0 } satisfies React.CSSProperties,
  barcode: { width: "100%", height: 30, overflow: "hidden", flex: "0 0 auto", marginTop: "auto" } satisfies React.CSSProperties,
  wizardActions: { display: "flex", justifyContent: "space-between", gap: 12, marginTop: 4 } satisfies React.CSSProperties,
};
