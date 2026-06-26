"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { api, apiBlob } from "@/lib/api";
import { resolveLabelNormalPrice, resolveStorePricingPolicy } from "@/lib/pricing-policy";
import { getPublicApiUrl } from "@/lib/runtime-config";
import { getClientStoreId } from "@/lib/tenant/store-context";

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
  id?: string;
  name: string;
  type?: "clothing" | "accessory" | "shipping" | "generic";
  useCase?: "clothing" | "accessory" | "shipping" | "generic";
  layout?: "product_cut_price" | "compact_cut_price" | "shipping" | "legacy";
  continuous?: boolean;
  fields?: string[];
  priceOptions?: PriceMode[];
  page: { widthMm: number; heightMm: number };
  label: { widthMm: number; heightMm: number; paddingMm: number };
  grid: { columns: number; rows: number };
};
type PriceMode = "normal" | "transfer" | "both" | "none";
type LabelOptions = {
  showPrice: boolean;
  priceMode: PriceMode;
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
  storeAddress?: string | null;
  price: string;
  normalPrice?: string;
  transferPrice?: string | null;
  logoUrl?: string | null;
  barcodeSvg: string;
};
type Preview = {
  template: Template;
  options: LabelOptions;
  totalLabels: number;
  labels: PreviewLabel[];
};
type PriceSettings = {
  hasTransferPrice: boolean;
  bankTransferDiscountPercentage: number;
};
type DefaultLabelPayload = {
  defaultLabel: {
    template: string;
    options: LabelOptions;
    templateOptions?: Record<string, LabelOptions>;
  };
};
type Toast = { type: "success" | "error" | "info"; message: string };
type VariantSortKey = "product" | "variant" | "sku" | "stock" | "price";
type SelectedLabelSortKey = "product" | "sku" | "stock" | "quantity";
type SortDirection = "asc" | "desc";

const storageKey = "labels-wizard-state-v5";
const ADMIN_LABELS_RESET_EVENT = "admin-labels:reset";
const defaultTemplateKey = "BROTHER_QL570_29X90";
const defaultOptions: LabelOptions = {
  showPrice: true,
  priceMode: "both",
  showStoreName: false,
  showProductName: true,
  showVariantName: true,
  showSku: true,
  showLogo: false,
};
const optionLabels: Record<keyof LabelOptions, string> = {
  showPrice: "Precio normal",
  priceMode: "Tipo de precio",
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

function normalizeSavedOptions(options?: Partial<LabelOptions>): LabelOptions {
  const priceMode = options?.showPrice === false ? "none" : options?.priceMode ?? defaultOptions.priceMode;

  return {
    ...defaultOptions,
    ...options,
    priceMode,
    showPrice: priceMode !== "none" && (options?.showPrice ?? true),
  };
}

function normalizeTemplateOptions(input?: Record<string, LabelOptions>): Record<string, LabelOptions> {
  if (!input || typeof input !== "object") return {};

  return Object.fromEntries(
    Object.entries(input).map(([key, options]) => [
      key,
      normalizeSavedOptions(options),
    ]),
  );
}

function resolveSavedTemplateOptions(
  templateKey: string,
  templateOptions: Record<string, LabelOptions>,
  fallback?: Partial<LabelOptions>,
) {
  return normalizeSavedOptions({
    ...(fallback ?? {}),
    ...(templateOptions[templateKey] ?? {}),
  });
}

function variantLabel(row: Pick<VariantRow, "productName" | "variantName">) {
  return [row.productName, row.variantName].filter(Boolean).join(" - ");
}

function templateUseCaseLabel(template: Pick<Template, "useCase" | "type">) {
  const useCase = template.useCase ?? template.type;
  if (useCase === "clothing") return "Ropa / productos";
  if (useCase === "accessory") return "Accesorios chicos";
  if (useCase === "shipping") return "Envios";
  return "General";
}

function nextPriceMode(current: PriceMode, target: "normal" | "transfer", checked: boolean): PriceMode {
  const normalChecked = target === "normal" ? checked : current === "normal" || current === "both";
  const transferChecked = target === "transfer" ? checked : current === "transfer" || current === "both";

  if (normalChecked && transferChecked) return "both";
  if (normalChecked) return "normal";
  if (transferChecked) return "transfer";
  return "none";
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
  const storeId = getClientStoreId();
  const pricingPolicy = useMemo(
    () => resolveStorePricingPolicy({ storeId }),
    [storeId],
  );
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [priceSettings, setPriceSettings] = useState<PriceSettings>({
    hasTransferPrice: false,
    bankTransferDiscountPercentage: 0,
  });
  const [selected, setSelected] = useState<Record<number, VariantRow>>({});
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [templateKey, setTemplateKey] = useState(defaultTemplateKey);
  const [defaultLabelTemplateKey, setDefaultLabelTemplateKey] = useState(defaultTemplateKey);
  const [options, setOptions] = useState<LabelOptions>(defaultOptions);
  const [templateOptions, setTemplateOptions] = useState<Record<string, LabelOptions>>({});
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
    activeOnly: false,
  });
  const [sortKey, setSortKey] = useState<VariantSortKey>("product");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedSortKey, setSelectedSortKey] = useState<SelectedLabelSortKey>("product");
  const [selectedSortDirection, setSelectedSortDirection] = useState<SortDirection>("asc");
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadingBase, setLoadingBase] = useState(false);
  const [selectingFiltered, setSelectingFiltered] = useState(false);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const didMountFilterEffect = useRef(false);
  const initialSavedWizardRef = useRef<string | null>(null);
  const [wizardStateReady, setWizardStateReady] = useState(false);

  const selectedRows = useMemo(() => Object.values(selected), [selected]);
  const sortedSelectedRows = useMemo(() => {
    const direction = selectedSortDirection === "asc" ? 1 : -1;

    return [...selectedRows].sort((a, b) => {
      const left = selectedLabelSortValue(a, selectedSortKey, quantities);
      const right = selectedLabelSortValue(b, selectedSortKey, quantities);

      if (typeof left === "number" && typeof right === "number") {
        return (left - right) * direction;
      }

      return String(left).localeCompare(String(right), "es", { numeric: true }) * direction;
    });
  }, [quantities, selectedRows, selectedSortDirection, selectedSortKey]);
  const visibleRows = useMemo(() => {
    if (sortKey !== "stock") return rows;
    const direction = sortDirection === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => (Number(a.stock ?? 0) - Number(b.stock ?? 0)) * direction);
  }, [rows, sortDirection, sortKey]);
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
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.key === templateKey) ?? templates[0] ?? null,
    [templateKey, templates],
  );
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

  function updateOptions(nextOptions: LabelOptions) {
    setOptions(nextOptions);
    setTemplateOptions((current) => ({
      ...current,
      [templateKey]: nextOptions,
    }));
  }

  function changeTemplate(nextTemplateKey: string) {
    const nextTemplate = templates.find((template) => template.key === nextTemplateKey);
    const savedOptions = resolveSavedTemplateOptions(nextTemplateKey, templateOptions);
    const nextMode = nextTemplate?.priceOptions?.includes(savedOptions.priceMode)
      ? savedOptions.priceMode
      : nextTemplate?.priceOptions?.[0] ?? "normal";
    setTemplateKey(nextTemplateKey);
    setOptions({ ...savedOptions, priceMode: nextMode, showPrice: nextMode !== "none" });
  }

  const resetLabelsWizard = useCallback(() => {
    setStep(1);
    setSelected({});
    setQuantities({});
    setTemplateKey(defaultLabelTemplateKey);
    setOptions(resolveSavedTemplateOptions(defaultLabelTemplateKey, templateOptions));
    setPreview(null);
    setPage(1);
    setFilteredSelectionIds(null);
    setFilters({
      search: "",
      sku: "",
      name: "",
      categoryId: "",
      stockOnly: false,
      activeOnly: false,
    });
    setNotice(null);
    window.sessionStorage.removeItem(storageKey);
  }, [defaultLabelTemplateKey, templateOptions]);

  useEffect(() => {
    const saved = window.sessionStorage.getItem(storageKey);
    initialSavedWizardRef.current = saved;
    if (!saved) {
      setWizardStateReady(true);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as {
        selected?: Record<number, VariantRow>;
        quantities?: Record<number, number>;
        templateKey?: string;
        options?: LabelOptions;
        templateOptions?: Record<string, LabelOptions>;
      };
      setSelected(parsed.selected ?? {});
      setQuantities(parsed.quantities ?? {});
      setTemplateOptions(normalizeTemplateOptions(parsed.templateOptions));
      setTemplateKey(parsed.templateKey ?? defaultTemplateKey);
      setOptions(normalizeSavedOptions(parsed.options));
    } catch {
      window.sessionStorage.removeItem(storageKey);
      initialSavedWizardRef.current = null;
    } finally {
      setWizardStateReady(true);
    }
  }, []);

  useEffect(() => {
    if (!wizardStateReady) return;
    window.sessionStorage.setItem(storageKey, JSON.stringify({ selected, quantities, templateKey, options, templateOptions }));
  }, [options, quantities, selected, templateKey, templateOptions, wizardStateReady]);

  useEffect(() => {
    window.addEventListener(ADMIN_LABELS_RESET_EVENT, resetLabelsWizard);
    return () => {
      window.removeEventListener(ADMIN_LABELS_RESET_EVENT, resetLabelsWizard);
    };
  }, [resetLabelsWizard]);

  useEffect(() => {
    if (!priceSettings.hasTransferPrice && (options.priceMode === "transfer" || options.priceMode === "both")) {
      setOptions((current) => ({ ...current, priceMode: "normal", showPrice: true }));
    }
  }, [options.priceMode, priceSettings.hasTransferPrice]);

  useEffect(() => {
    if (!selectedTemplate?.priceOptions?.length) return;
    if (selectedTemplate.priceOptions.includes(options.priceMode)) return;
    const nextPriceMode = selectedTemplate.priceOptions[0] ?? "normal";
    setOptions((current) => ({ ...current, priceMode: nextPriceMode, showPrice: nextPriceMode !== "none" }));
  }, [options.priceMode, selectedTemplate]);

  useEffect(() => {
    setPreview(null);
  }, [selected, quantities, templateKey, options]);

  useEffect(() => {
    setFilteredSelectionIds(null);
  }, [filters, sortDirection, sortKey]);

  useEffect(() => {
    setLoadingBase(true);
    Promise.all([
      api("/admin/labels/templates") as Promise<Template[] | { templates: Template[]; priceSettings: PriceSettings }>,
      api("/admin/labels/default") as Promise<DefaultLabelPayload>,
      api("/categories") as Promise<Category[]>,
    ])
      .then(([nextTemplates, defaultLabelPayload, nextCategories]) => {
        const templatePayload = Array.isArray(nextTemplates)
          ? { templates: nextTemplates, priceSettings: { hasTransferPrice: false, bankTransferDiscountPercentage: 0 } }
          : nextTemplates;
        const nextTemplateOptions = normalizeTemplateOptions(defaultLabelPayload.defaultLabel.templateOptions);
        const defaultTemplate = defaultLabelPayload.defaultLabel.template;
        const preferredTemplateKey = templatePayload.templates.some((template) => template.key === defaultTemplate)
          ? defaultTemplate
          : templatePayload.templates[0]?.key ?? defaultTemplateKey;
        setTemplates(templatePayload.templates);
        setPriceSettings(templatePayload.priceSettings);
        setTemplateOptions(nextTemplateOptions);
        setDefaultLabelTemplateKey(preferredTemplateKey);
        if (!templatePayload.templates.some((template) => template.key === preferredTemplateKey)) {
          const nextTemplateKey = templatePayload.templates[0]?.key ?? "BROTHER_QL570_62X29_CLOTHING";
          setTemplateKey(nextTemplateKey);
          setDefaultLabelTemplateKey(nextTemplateKey);
          setOptions(resolveSavedTemplateOptions(nextTemplateKey, nextTemplateOptions, defaultLabelPayload.defaultLabel.options));
        } else {
          setTemplateKey(preferredTemplateKey);
          setOptions(resolveSavedTemplateOptions(preferredTemplateKey, nextTemplateOptions, defaultLabelPayload.defaultLabel.options));
        }
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
    if (!didMountFilterEffect.current) {
      didMountFilterEffect.current = true;
      return;
    }

    const timeout = window.setTimeout(() => {
      if (page === 1) {
        void loadRows(1);
      } else {
        setPage(1);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [filters]);

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
        setSelected(Object.fromEntries(itemsPayload.map((row) => [row.id, row])));
        setQuantities(Object.fromEntries(itemsPayload.map((row) => [row.id, Math.max(1, row.stock)])));
        setFilteredSelectionIds(new Set(itemsPayload.map((row) => row.id)));
        setStep(2);
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
    params.set("sortBy", sortKey);
    params.set("sortDirection", sortDirection);
    return params;
  }

  function changeSort(nextKey: VariantSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "stock" ? "desc" : "asc");
    if (page !== 1) {
      setPage(1);
    }
  }

  function changeSelectedSort(nextKey: SelectedLabelSortKey) {
    if (selectedSortKey === nextKey) {
      setSelectedSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSelectedSortKey(nextKey);
    setSelectedSortDirection(["stock", "quantity"].includes(nextKey) ? "desc" : "asc");
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
            <button type="button" style={ghostButtonStyle} disabled={loadingRows || selectingFiltered} onClick={() => void toggleAllFiltered()}>
              {selectingFiltered ? "Procesando..." : allFilteredSelected ? "Quitar filtrados" : "Seleccionar todos los filtrados"}
            </button>
          </aside>

          <TableWrap>
            <table style={styles.table}>
              <thead>
                <tr>
                  <Th />
                  <SortableTh sortKey="product" activeKey={sortKey} direction={sortDirection} onSort={changeSort}>Producto</SortableTh>
                  <SortableTh sortKey="variant" activeKey={sortKey} direction={sortDirection} onSort={changeSort}>Variante</SortableTh>
                  <SortableTh sortKey="sku" activeKey={sortKey} direction={sortDirection} onSort={changeSort}>SKU</SortableTh>
                  <SortableTh sortKey="stock" activeKey={sortKey} direction={sortDirection} onSort={changeSort}>Stock</SortableTh>
                  <SortableTh sortKey="price" activeKey={sortKey} direction={sortDirection} onSort={changeSort}>Precio</SortableTh>
                </tr>
              </thead>
              <tbody>
                {loadingRows ? <StateRow colSpan={6} label="Cargando variantes..." /> : null}
                {!loadingRows && rows.length === 0 ? <StateRow colSpan={6} label="No hay variantes para estos filtros." /> : null}
                {!loadingRows && visibleRows.map((row) => (
                  <tr key={row.id} onClick={() => toggle(row)} style={selectableRowStyle(Boolean(selected[row.id]))}>
                    <Td><input type="checkbox" checked={Boolean(selected[row.id])} onClick={(event) => event.stopPropagation()} onChange={() => toggle(row)} /></Td>
                    <Td><div style={styles.productCell}><ProductThumb row={row} /><strong>{row.productName}</strong></div></Td>
                    <Td>{row.variantName || "Unica"}</Td>
                    <Td>{row.sku?.trim() ? <code>{row.sku}</code> : <span style={styles.skuMissing}>Sin SKU</span>}</Td>
                    <Td>{row.stock}</Td>
                    <Td>{formatMoney(resolveLabelNormalPrice(row.price, pricingPolicy))}</Td>
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
            <thead>
              <tr>
                <SortableSelectedTh sortKey="product" activeKey={selectedSortKey} direction={selectedSortDirection} onSort={changeSelectedSort}>Producto</SortableSelectedTh>
                <SortableSelectedTh sortKey="sku" activeKey={selectedSortKey} direction={selectedSortDirection} onSort={changeSelectedSort}>SKU</SortableSelectedTh>
                <SortableSelectedTh sortKey="stock" activeKey={selectedSortKey} direction={selectedSortDirection} onSort={changeSelectedSort}>Stock</SortableSelectedTh>
                <SortableSelectedTh sortKey="quantity" activeKey={selectedSortKey} direction={selectedSortDirection} onSort={changeSelectedSort}>Cantidad etiquetas</SortableSelectedTh>
              </tr>
            </thead>
            <tbody>
              {sortedSelectedRows.map((row) => (
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
        <div style={styles.templatePanel}>
          {loadingBase && templates.length === 0 ? <div style={styles.stateRow}>Cargando plantillas...</div> : null}
          <div style={styles.templateControls}>
            <Field label="Plantilla">
              <select style={styles.input} value={templateKey} onChange={(event) => changeTemplate(event.target.value)}>
                {templates.map((template) => (
                  <option key={template.key} value={template.key}>{template.name}</option>
                ))}
              </select>
            </Field>
            {selectedTemplate ? (
              <div style={styles.templateSummary}>
                <strong>{selectedTemplate.name}</strong>
                <span>
                  {selectedTemplate.label.widthMm} mm x {selectedTemplate.continuous ? "continuo" : `${selectedTemplate.label.heightMm} mm`}
                </span>
                <small>{templateUseCaseLabel(selectedTemplate)} - {selectedTemplate.fields?.join(", ")}</small>
              </div>
            ) : null}
          </div>
          <div style={styles.optionsPanel}>
            <label style={styles.check}>
              <input
                type="checkbox"
                checked={options.priceMode === "normal" || options.priceMode === "both"}
                disabled={selectedTemplate?.priceOptions?.includes("normal") === false}
                onChange={(event) => {
                  const priceMode = nextPriceMode(options.priceMode, "normal", event.target.checked);
                  updateOptions({ ...options, showPrice: priceMode !== "none", priceMode });
                }}
              />
              Precio normal
            </label>
            <label style={styles.check}>
              <input
                type="checkbox"
                checked={options.priceMode === "transfer" || options.priceMode === "both"}
                disabled={!priceSettings.hasTransferPrice || selectedTemplate?.priceOptions?.includes("transfer") === false}
                onChange={(event) => {
                  const priceMode = nextPriceMode(options.priceMode, "transfer", event.target.checked);
                  updateOptions({ ...options, showPrice: priceMode !== "none", priceMode });
                }}
              />
              Precio transferencia
            </label>
            {priceSettings.hasTransferPrice ? (
              <span style={styles.priceHint}>Transferencia: {priceSettings.bankTransferDiscountPercentage}% de descuento.</span>
            ) : (
              <span style={styles.priceHint}>La tienda no tiene descuento por transferencia configurado.</span>
            )}
            {(["showStoreName", "showProductName", "showVariantName", "showSku", "showLogo"] as const).map((key) => (
              <label key={key} style={styles.check}>
                <input
                  type="checkbox"
                  checked={Boolean(options[key])}
                  onChange={(event) => updateOptions({ ...options, [key]: event.target.checked })}
                />
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
              <div
                key={label.id}
                className={`admin-label-preview-card admin-label-layout-${preview?.template.layout ?? "legacy"} admin-label-template-${preview?.template.key.toLowerCase() ?? "unknown"}`}
                style={labelPreviewStyle(preview?.template)}
              >
                {renderPreviewLabel(label, preview)}
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
          display: flex;
          gap: 5px;
        }

        .admin-label-main-zone {
          min-width: 0;
          flex: 1 1 auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
        }

        .admin-label-price-zone {
          width: 34%;
          min-width: 58px;
          border-left: 1px dashed #111;
          padding-left: 5px;
          display: grid;
          align-content: center;
          gap: 4px;
          text-align: right;
          flex: 0 0 auto;
        }

        .admin-label-price-zone span {
          display: grid;
          gap: 3px;
        }

        .admin-label-price-zone small {
          color: #111;
          font-size: 8px;
          font-weight: 700;
          line-height: 1;
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

        .admin-label-price-zone b {
          font-size: 14px;
          line-height: 1;
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
          height: 40px;
          display: block;
          flex: 0 0 auto;
        }

        .admin-label-layout-compact_cut_price {
          gap: 4px;
        }

        .admin-label-layout-compact_cut_price .admin-label-preview-copy strong,
        .admin-label-layout-compact_cut_price .admin-label-preview-copy span {
          font-size: 8px;
        }

        .admin-label-layout-compact_cut_price .admin-label-preview-barcode svg {
          height: 40px;
        }

        .admin-label-template-brother_ql570_62x29_clothing .admin-label-preview-barcode svg,
        .admin-label-template-brother_ql570_29x90 .admin-label-preview-barcode svg,
        .admin-label-template-trojani_30x70 .admin-label-preview-barcode svg {
          height: 56px;
        }

        .admin-label-layout-compact_cut_price .admin-label-price-zone {
          width: 31%;
          min-width: 46px;
          padding-left: 4px;
          gap: 2px;
        }

        .admin-label-layout-compact_cut_price .admin-label-price-zone b {
          font-size: 12px;
        }

        .admin-label-template-brother_ql570_29x90 .admin-label-preview-card,
        .admin-label-template-brother_ql570_29x90,
        .admin-label-template-trojani_30x70 .admin-label-preview-card,
        .admin-label-template-trojani_30x70 {
          gap: 6px;
        }

        .admin-label-template-brother_ql570_29x90 .admin-label-preview-copy strong,
        .admin-label-template-trojani_30x70 .admin-label-preview-copy strong {
          font-size: 10px;
        }

        .admin-label-template-brother_ql570_29x90 .admin-label-preview-copy span,
        .admin-label-template-trojani_30x70 .admin-label-preview-copy span {
          font-size: 9px;
        }

        .admin-label-template-brother_ql570_29x90 .admin-label-price-zone b,
        .admin-label-template-trojani_30x70 .admin-label-price-zone b {
          font-size: 16px;
        }

        .admin-label-template-trojani_100x150_6up .admin-label-preview-copy strong {
          font-size: 10px;
        }

        .admin-label-template-trojani_100x150_6up .admin-label-preview-copy span {
          font-size: 9px;
        }

        .admin-label-template-trojani_100x150_6up .admin-label-price-zone small {
          font-size: 9px;
        }

        .admin-label-template-trojani_100x150_6up .admin-label-price-zone b {
          font-size: 17px;
        }

        .admin-label-template-trojani_100x150_6up .admin-label-preview-card code {
          font-size: 8px;
        }

        .admin-label-template-trojani_44x55 {
          flex-direction: column;
          gap: 5px;
        }

        .admin-label-template-trojani_44x55 .admin-label-main-zone {
          width: 100%;
          min-height: 0;
        }

        .admin-label-template-trojani_44x55 .admin-label-preview-logo {
          height: 24px;
          justify-content: center;
          align-items: center;
        }

        .admin-label-template-trojani_44x55 .admin-label-price-zone {
          width: 100%;
          min-width: 0;
          margin-top: auto;
          border-left: 0;
          border-top: 1px dashed #111;
          padding: 4px 0 0;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          align-content: start;
          gap: 4px;
          text-align: center;
        }

        .admin-label-template-trojani_44x55 .admin-label-preview-copy strong {
          font-size: 10px;
          font-weight: 800;
        }

        .admin-label-template-trojani_44x55 .admin-label-preview-copy span {
          font-size: 9px;
          font-weight: 800;
        }

        .admin-label-template-trojani_44x55 .admin-label-price-zone small {
          font-size: 9px;
          font-weight: 800;
        }

        .admin-label-template-trojani_44x55 .admin-label-price-zone b {
          font-size: 15px;
          font-weight: 800;
        }

        .admin-label-template-trojani_44x55 .admin-label-preview-card code {
          font-size: 9px;
          font-weight: 800;
        }

        .admin-label-template-trojani_44x55 .admin-label-preview-barcode svg {
          height: 42px;
        }

        .admin-label-layout-shipping {
          flex-direction: column;
        }

        .admin-label-layout-shipping .admin-label-preview-copy strong {
          font-size: 14px;
        }

        .admin-label-layout-shipping .admin-label-preview-copy span {
          font-size: 10px;
        }

        .admin-label-layout-shipping .admin-label-preview-barcode svg {
          height: 58px;
          margin-top: auto;
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

function SortableTh({
  children,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  children: React.ReactNode;
  sortKey: VariantSortKey;
  activeKey: VariantSortKey;
  direction: SortDirection;
  onSort: (key: VariantSortKey) => void;
}) {
  const active = activeKey === sortKey;

  return (
    <th style={styles.th}>
      <button type="button" style={styles.sortButton} onClick={() => onSort(sortKey)}>
        {children}
        {active ? <span>{direction === "asc" ? "^" : "v"}</span> : null}
      </button>
    </th>
  );
}

function SortableSelectedTh({
  children,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  children: React.ReactNode;
  sortKey: SelectedLabelSortKey;
  activeKey: SelectedLabelSortKey;
  direction: SortDirection;
  onSort: (key: SelectedLabelSortKey) => void;
}) {
  const active = activeKey === sortKey;

  return (
    <th style={styles.th}>
      <button type="button" style={styles.sortButton} onClick={() => onSort(sortKey)}>
        {children}
        {active ? <span>{direction === "asc" ? "^" : "v"}</span> : null}
      </button>
    </th>
  );
}

function selectedLabelSortValue(
  row: VariantRow,
  key: SelectedLabelSortKey,
  quantities: Record<number, number>,
) {
  if (key === "sku") return row.sku ?? "";
  if (key === "stock") return Number(row.stock ?? 0);
  if (key === "quantity") return Number(quantities[row.id] ?? 0);
  return variantLabel(row);
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={styles.td}>{children}</td>;
}

function StateRow({ colSpan, label }: { colSpan: number; label: string }) {
  return <tr><td colSpan={colSpan} style={styles.stateCell}>{label}</td></tr>;
}

function renderPreviewLabel(label: PreviewLabel, preview: Preview | null) {
  if (!preview) return null;
  const { template, options } = preview;
  const priceLines = previewPriceLines(label, options.priceMode);
  const cutPriceLayout = template.layout === "product_cut_price" || template.layout === "compact_cut_price";

  if (template.layout === "shipping") {
    return (
      <>
        <div className="admin-label-preview-copy">
          {options.showStoreName ? <strong title={label.storeName}>{label.storeName || "Pedido interno"}</strong> : null}
          {options.showStoreName && label.storeAddress ? <span title={label.storeAddress}>{label.storeAddress}</span> : null}
          <span title={label.productName}>Producto: {label.productName}</span>
          {label.variantName ? <span title={label.variantName}>Variante: {label.variantName}</span> : null}
        </div>
        <div className="admin-label-preview-barcode" dangerouslySetInnerHTML={{ __html: label.barcodeSvg }} />
        <code title={label.sku}>{label.sku}</code>
      </>
    );
  }

  return (
    <>
      <div className="admin-label-main-zone">
        {options.showLogo ? (
          <div className="admin-label-preview-logo">
            <LabelLogo label={label} />
          </div>
        ) : null}
        <div className="admin-label-preview-copy">
          {options.showStoreName ? <strong title={label.storeName}>{label.storeName}</strong> : null}
          {options.showStoreName && label.storeAddress ? <span title={label.storeAddress}>{label.storeAddress}</span> : null}
          {options.showProductName ? <span title={label.productName}>{label.productName}</span> : null}
          {options.showVariantName ? <span title={label.variantName}>{label.variantName}</span> : null}
          {!cutPriceLayout && options.showPrice
            ? priceLines.map((line) => <b key={`${line.caption}-${line.value}`}>{[line.caption, line.value].filter(Boolean).join(" ")}</b>)
            : null}
        </div>
        <div className="admin-label-preview-barcode" dangerouslySetInnerHTML={{ __html: label.barcodeSvg }} />
        {options.showSku ? <code title={label.sku}>{label.sku}</code> : null}
      </div>
      {cutPriceLayout && priceLines.length > 0 ? (
        <div className="admin-label-price-zone">
          {priceLines.map((line) => (
            <span key={`${line.caption}-${line.value}`}>
              {line.caption ? <small>{line.caption}</small> : null}
              <b>{line.value}</b>
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}

function previewPriceLines(label: PreviewLabel, priceMode: PriceMode) {
  const normalPrice = label.normalPrice ?? label.price;
  const transferPrice = label.transferPrice ?? normalPrice;

  if (priceMode === "none") return [];
  if (priceMode === "transfer") return [{ caption: "EFECT/TRANSF", value: transferPrice }];
  if (priceMode === "both") {
    return [
      { caption: "TARJETA", value: normalPrice },
      { caption: "EFECT/TRANSF", value: transferPrice },
    ];
  }
  return [{ caption: "", value: normalPrice }];
}

function labelPreviewStyle(template?: Template): React.CSSProperties {
  const widthMm = template?.label.widthMm ?? 62;
  const heightMm = template?.label.heightMm ?? 29;
  const scale = template?.continuous ? 3.3 : widthMm <= 54 ? 4.6 : 4.4;

  return {
    ...styles.previewCard,
    width: Math.round(widthMm * scale),
    height: Math.round(heightMm * scale),
  };
}

function stepButtonStyle(active: boolean): React.CSSProperties {
  return {
    flex: "1 1 160px",
    minHeight: 56,
    borderRadius: 16,
    border: active ? "1px solid #73b5a5" : "1px solid rgba(26, 26, 26, 0.12)",
    background: active ? "#a9d7cc" : "#edf7f4",
    color: "#1a1a1a",
    cursor: "pointer",
    textAlign: "left",
    padding: 12,
    boxShadow: active ? "0 10px 24px rgba(26, 26, 26, 0.08)" : "none",
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
    background: active ? "rgba(255,255,255,0.34)" : "rgba(115, 181, 165, 0.18)",
    color: "#000",
    fontWeight: 700,
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
  check: { display: "flex", alignItems: "center", gap: 8, color: "#1a1a1a", fontSize: 14 } satisfies React.CSSProperties,
  tableWrap: { minWidth: 0, overflowX: "auto" } satisfies React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse", minWidth: 760 } satisfies React.CSSProperties,
  th: { padding: 12, borderBottom: "1px solid var(--checkout-border)", textAlign: "left", verticalAlign: "middle", color: "var(--account-text-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" } satisfies React.CSSProperties,
  sortButton: { border: 0, background: "transparent", color: "inherit", padding: 0, font: "inherit", textTransform: "inherit", letterSpacing: "inherit", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 } satisfies React.CSSProperties,
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
  templatePanel: { display: "grid", gap: 14 } satisfies React.CSSProperties,
  templateControls: { display: "grid", gridTemplateColumns: "minmax(240px, 380px) minmax(0, 1fr)", gap: 14, alignItems: "stretch" } satisfies React.CSSProperties,
  templateSummary: { display: "grid", gap: 6, alignContent: "center", background: "#edf7f4", border: "1px solid rgba(26, 26, 26, 0.12)", borderRadius: 16, padding: 16, color: "#1a1a1a" } satisfies React.CSSProperties,
  optionsPanel: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, background: "#edf7f4", border: "1px solid rgba(26, 26, 26, 0.12)", borderRadius: 20, padding: 16 } satisfies React.CSSProperties,
  priceHint: { color: "#1a1a1a", fontSize: 13, alignSelf: "center" } satisfies React.CSSProperties,
  previewLayout: { display: "grid", gap: 18 } satisfies React.CSSProperties,
  previewMeta: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" } satisfies React.CSSProperties,
  previewBadges: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" } satisfies React.CSSProperties,
  pill: { display: "inline-flex", alignItems: "center", padding: "8px 12px", borderRadius: 999, background: "rgba(109,64,40,0.08)", color: "var(--accent-strong)" } satisfies React.CSSProperties,
  printNotice: { color: "var(--account-text-muted)", border: "1px solid var(--checkout-border)", borderRadius: 999, padding: "8px 12px" } satisfies React.CSSProperties,
  previewGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, maxHeight: 620, overflow: "auto", paddingRight: 4 } satisfies React.CSSProperties,
  previewCard: {
    display: "flex",
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
