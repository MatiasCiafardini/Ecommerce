"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, apiBlob } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/asset-url";
import { getClientStoreContext, getClientStoreId } from "@/lib/tenant/store-context";
import {
  clampImageOffset,
  clampImageZoom,
  getCatalogImageTransform,
} from "@/lib/product-image-layout";
import { money, orderStatusLabel, type CustomerOrder } from "./order-utils";
import AdminOrderDetailPanel from "./AdminOrderDetailPanel";
import AdminShipmentsSection from "./AdminShipmentsSection";
import AdminReturnsSection from "./AdminReturnsSection";
import AdminPromotionsSection from "./AdminPromotionsSection";
import AdminLabelsGenerator from "./AdminLabelsGenerator";
import DeveloperModePanel from "./DeveloperModePanel";
import type { AdminReturn, AdminSection, AdminShipment } from "./admin-types";

type Props = {
  section: AdminSection;
  user: {
    id: number;
    email: string;
    storeId?: number;
    role?: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    name?: string | null;
  };
  onSectionChange: (section: AdminSection) => void;
};

type Product = {
  id: number;
  title: string;
  slug: string;
  published: boolean;
  description?: string | null;
  weightGrams?: number | null;
  packageHeightCm?: number | null;
  packageWidthCm?: number | null;
  packageLengthCm?: number | null;
  packagingTemplateId?: string | null;
  images?: Array<{
    id: number;
    url: string;
    position?: number;
    offsetX?: number;
    offsetY?: number;
    zoom?: number;
  }>;
  variants?: Array<{
    id: number;
    price?: number | string | null;
    inventories?: Array<{ quantity?: number | null }>;
  }>;
  categories?: Array<{ category: { id: number; name: string } }>;
  optionValues?: Array<{ value?: string; productOptionId?: number }>;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  status?: "active" | "hidden";
  parentId?: number | null;
  parent?: { id: number; name: string; slug: string } | null;
  imageUrl?: string | null;
  productsCount?: number;
  childrenCount?: number;
  publishedProductsCount?: number;
  outOfStockProductsCount?: number;
  products?: Array<{ id: number; title: string; slug: string }>;
  storeId?: number | null;
  createdAt?: string;
  updatedAt?: string;
};
type CategoryDraft = {
  id: number | null;
  name: string;
  slug: string;
  description: string;
  status: "active" | "hidden";
  parentId: string;
  imageUrl: string;
};
type Customer = {
  id: number;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
};
type ProductOption = {
  id: number;
  name: string;
  attributeType?: "text" | "color" | "number";
  createdAt?: string;
  updatedAt?: string;
  productsCount?: number;
  usageCount?: number;
  products?: Array<{ id: number; title: string; slug: string; variantsCount: number }>;
  reusableValues?: Array<{
    id: number;
    value: string;
    productsCount?: number;
    position?: number;
    visualColor?: string | null;
  }>;
};
type AttributeDraft = {
  id: number | null;
  name: string;
  attributeType: "text" | "color" | "number";
  newValue: string;
  newValueColor: string;
  bulkValues: string;
};
type DraftVariant = {
  sku: string;
  price: string;
  Size: string;
  Color: string;
  inventoryQuantity: string;
  weight: string;
  width: string;
  height: string;
  length: string;
};

type ProductWizardStep =
  | "info"
  | "logistics"
  | "images"
  | "labels"
  | "variants"
  | "publish";

type PackagingTemplate = {
  id: string;
  name: string;
  weight: string;
  width: string;
  height: string;
  length: string;
};

type ImageLayoutState = {
  position: number;
  offsetX: number;
  offsetY: number;
  zoom: number;
};

type UploadImage = {
  clientId: string;
  file: File;
  name: string;
  previewUrl: string;
  status: "pending" | "uploading" | "error";
  progress: number;
  errorMessage?: string;
} & ImageLayoutState;

type ExistingProductImage = {
  id: number;
  url: string;
} & ImageLayoutState;

type EditableVariant = DraftVariant & {
  id?: number;
};

type ProductOptionValueEntry = {
  id: number;
  productOptionId: number;
  value: string;
};

type PendingOptionRemoval =
  | {
      kind: "option";
      optionId: number;
      optionName: string;
      productsCount: number;
    }
  | {
      kind: "value";
      optionId: number;
      optionName: string;
      value: string;
      productsCount: number;
    }
  | {
      kind: "variant";
      variantIndex: number;
      variantLabel: string;
      productsCount: number;
    }
  | {
      kind: "product";
      productId: number;
      productTitle: string;
      productsCount: number;
    }
  | {
      kind: "category";
      categoryId: number;
      categoryName: string;
      productsCount: number;
    };

type DuplicateSkuPromptState = {
  title: string;
};

type PendingVariantSwitchState = {
  nextIndex: number | null;
};

const statuses = [
  "pending",
  "paid",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
] as const;
const operationalPendingStatuses = new Set([
  "pending",
  "paid",
  "processing",
  "packed",
]);

const emptyVariant = (): DraftVariant => ({
  sku: "",
  price: "",
  Size: "",
  Color: "",
  inventoryQuantity: "",
  weight: "",
  width: "",
  height: "",
  length: "",
});

const productWizardSteps: Array<{ id: ProductWizardStep; label: string }> = [
  { id: "info", label: "Informacion" },
  { id: "logistics", label: "Logistica" },
  { id: "images", label: "Imagenes" },
  { id: "labels", label: "Atributos" },
  { id: "variants", label: "Variantes" },
  { id: "publish", label: "Publicacion" },
];

const packagingTemplates: PackagingTemplate[] = [
  { id: "small-bag", name: "Bolsa ropa chica", weight: "250", width: "22", height: "4", length: "28" },
  { id: "medium-bag", name: "Bolsa ropa mediana", weight: "450", width: "28", height: "6", length: "36" },
  { id: "large-bag", name: "Bolsa ropa grande", weight: "750", width: "35", height: "9", length: "45" },
  { id: "small-box", name: "Caja chica", weight: "700", width: "20", height: "10", length: "30" },
  { id: "medium-box", name: "Caja mediana", weight: "1200", width: "30", height: "15", length: "40" },
  { id: "large-box", name: "Caja grande", weight: "2200", width: "40", height: "25", length: "55" },
];

const defaultImageLayout = (position = 0): ImageLayoutState => ({
  position,
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
});

const MAX_IMAGE_UPLOAD_BYTES = 900 * 1024;
const MAX_IMAGE_DIMENSION = 1400;
const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55, 0.45];
const IMAGE_UPLOAD_CONCURRENCY = 2;
const ADMIN_ORDERS_UPDATED_EVENT = "admin-orders:updated";
const ADMIN_ORDERS_POLL_INTERVAL_MS = 15_000;

const revokeUploadImages = (images: UploadImage[]) => {
  images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
};

const normalizeImagePositions = <T extends ImageLayoutState>(images: T[]): T[] =>
  images.map((image, index) => ({ ...image, position: index }));

function createUploadImageId() {
  return `upload-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

async function loadImageElement(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () =>
        reject(new Error(`No se pudo procesar la imagen ${file.name}.`));
      element.src = objectUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number, mimeType = "image/jpeg") {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

function renameFileExtension(name: string, ext: string) {
  return name.replace(/\.[^.]+$/u, "") + ext;
}

async function optimizeImageForUpload(file: File) {
  if (file.size <= MAX_IMAGE_UPLOAD_BYTES && /image\/(jpe?g|webp)/i.test(file.type)) {
    return file;
  }

  const image = await loadImageElement(file);
  const longestSide = Math.max(image.width, image.height);
  const scale = longestSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / longestSide : 1;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No se pudo preparar la imagen para subir.");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  // Detect WebP encoding support (unavailable only on very old browsers)
  const testBlob = await canvasToBlob(canvas, 0.85, "image/webp");
  const outputMime = testBlob?.type === "image/webp" ? "image/webp" : "image/jpeg";
  const outputExt = outputMime === "image/webp" ? ".webp" : ".jpg";

  // Reuse the test blob if it already fits
  if (testBlob && testBlob.type === outputMime && testBlob.size <= MAX_IMAGE_UPLOAD_BYTES) {
    return new File([testBlob], renameFileExtension(file.name, outputExt), {
      type: outputMime,
      lastModified: Date.now(),
    });
  }

  for (const quality of QUALITY_STEPS) {
    const blob = await canvasToBlob(canvas, quality, outputMime);
    if (!blob) continue;

    if (blob.size <= MAX_IMAGE_UPLOAD_BYTES || quality === QUALITY_STEPS.at(-1)) {
      return new File([blob], renameFileExtension(file.name, outputExt), {
        type: outputMime,
        lastModified: Date.now(),
      });
    }
  }

  throw new Error(`No se pudo reducir el peso de ${file.name}.`);
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
) {
  const safeConcurrency = Math.max(1, Math.min(concurrency, items.length || 1));
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: safeConcurrency }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        await worker(items[currentIndex], currentIndex);
      }
    }),
  );
}

function scopeCategoriesToActiveStore(items: Category[]) {
  const storeId = (() => {
    try {
      return getClientStoreId();
    } catch {
      return null;
    }
  })();

  if (!storeId) {
    return items;
  }

  const scoped = items.filter((item) => item.storeId === storeId);
  return scoped.length > 0 ? scoped : items;
}

export default function AdminWorkspace({
  section,
  user,
  onSectionChange,
}: Props) {
  if (section === "admin-developer")
    return (
      <AdminDeveloperSection
        user={user}
        onBack={() => onSectionChange("admin-overview")}
      />
    );
  if (section === "admin-accounting") return <AdminAccountingSection />;
  if (section === "admin-products") return <AdminProductsSection />;
  if (section === "admin-labels") return <AdminLabelsSection />;
  if (section === "admin-categories")
    return <AdminProductsSection initialTab="categories" />;
  if (section === "admin-orders") return <AdminOrdersPanelSection />;
  if (section === "admin-customers") return <AdminCustomersSection />;
  if (section === "admin-shipments") return <AdminShipmentsSection />;
  if (section === "admin-returns") return <AdminReturnsSection />;
  if (section === "admin-promotions") return <AdminPromotionsSection />;
  if (section === "admin-settings") return <AdminSettingsSection />;
  return (
    <AdminOverviewSection
      onOpenDeveloper={() => onSectionChange("admin-developer")}
    />
  );
}

type AdminPaymentConfig = {
  bankTransfer?: {
    alias?: string | null;
    discountPercentage?: number | null;
  } | null;
};

function AdminSettingsSection() {
  const [settingsTab, setSettingsTab] = useState<"transfer">("transfer");
  const [alias, setAlias] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    api("/store/admin/integrations")
      .then((config: AdminPaymentConfig) => {
        if (!mounted) return;
        setAlias(config?.bankTransfer?.alias?.trim() ?? "");
        setDiscountPercentage(String(Number(config?.bankTransfer?.discountPercentage ?? 0)));
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar la configuracion.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function onSaveTransfer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await api("/store/admin/integrations/bank-transfer", {
        method: "PUT",
        body: JSON.stringify({
          alias,
          discountPercentage: Number(discountPercentage || 0),
        }),
      });
      const bankTransfer = (response as AdminPaymentConfig).bankTransfer;
      setAlias(bankTransfer?.alias?.trim() ?? "");
      setDiscountPercentage(String(Number(bankTransfer?.discountPercentage ?? 0)));
      setMessage("Configuracion de transferencia guardada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la transferencia.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={panelStyle}>
      <div style={tabRailStyle}>
        <button
          type="button"
          style={workspaceTabStyle(settingsTab === "transfer")}
          onClick={() => setSettingsTab("transfer")}
        >
          Transferencia
        </button>
      </div>

      {settingsTab === "transfer" ? (
        <form style={blockStyle} onSubmit={onSaveTransfer}>
          <div>
            <p style={eyebrowStyle}>Pagos</p>
            <h3 style={title3Style}>Transferencia bancaria</h3>
            <p style={copyStyle}>Este alias aparece para los clientes antes de subir el comprobante.</p>
          </div>

          {loading ? <p style={copyStyle}>Cargando configuracion...</p> : null}
          {error ? <p style={{ ...copyStyle, color: "#ffb7b7" }}>{error}</p> : null}
          {message ? <p style={{ ...copyStyle, color: "var(--admin-tone-success-color)" }}>{message}</p> : null}

          <div style={optionGridStyle}>
            <label style={{ display: "grid", gap: 8 }}>
              <span style={metaStyle}>Alias de transferencia</span>
              <input
                value={alias}
                onChange={(event) => setAlias(event.target.value)}
                maxLength={80}
                placeholder="ej: mi.tienda.mp"
                style={fieldStyle}
              />
            </label>
            <label style={{ display: "grid", gap: 8 }}>
              <span style={metaStyle}>Descuento por transferencia (%)</span>
              <input
                value={discountPercentage}
                onChange={(event) => setDiscountPercentage(event.target.value)}
                type="number"
                min={0}
                max={100}
                step="0.01"
                style={fieldStyle}
              />
            </label>
          </div>

          <div style={itemStyle}>
            <span style={metaStyle}>Vista cliente</span>
            <strong>{alias.trim() || "Alias pendiente"}</strong>
            <small style={copyStyle}>
              {Number(discountPercentage || 0) > 0
                ? `${Number(discountPercentage || 0)}% de descuento por transferencia`
                : "Sin descuento adicional configurado"}
            </small>
          </div>

          <button type="submit" disabled={saving || loading} style={primaryButtonStyle}>
            {saving ? "Guardando..." : "Guardar transferencia"}
          </button>
        </form>
      ) : null}
    </section>
  );
}

function useViewportFlags() {
  const [isTabletOrSmaller, setIsTabletOrSmaller] = useState(false);
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const tabletQuery = window.matchMedia("(max-width: 1024px)");
    const phoneQuery = window.matchMedia("(max-width: 640px)");

    const sync = () => {
      setIsTabletOrSmaller(tabletQuery.matches);
      setIsPhone(phoneQuery.matches);
    };

    sync();
    tabletQuery.addEventListener("change", sync);
    phoneQuery.addEventListener("change", sync);

    return () => {
      tabletQuery.removeEventListener("change", sync);
      phoneQuery.removeEventListener("change", sync);
    };
  }, []);

  return {
    isTabletOrSmaller,
    isPhone,
  };
}

function AdminOverviewSection({
  onOpenDeveloper,
}: {
  onOpenDeveloper: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [shipments, setShipments] = useState<AdminShipment[]>([]);
  const [returns, setReturns] = useState<AdminReturn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, c, o, u, s, r] = await Promise.all([
          api("/products"),
          api("/categories"),
          api("/orders"),
          api("/customers"),
          api("/admin/shipments"),
          api("/returns"),
        ]);
        setProducts(Array.isArray(p) ? p : []);
        setCategories(Array.isArray(c) ? scopeCategoriesToActiveStore(c as Category[]) : []);
        setOrders(Array.isArray(o) ? o : []);
        setCustomers(Array.isArray(u) ? u : []);
        setShipments(Array.isArray(s) ? (s as AdminShipment[]) : []);
        setReturns(Array.isArray(r) ? (r as AdminReturn[]) : []);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <section style={panelStyle}>
      <Header
        title="Panel general"
        copy="Resumen general de la tienda."
        actions={
          <button
            type="button"
            onClick={onOpenDeveloper}
            style={primaryButtonStyle}
          >
            Modo desarrollador
          </button>
        }
      />
      {loading ? (
        <StateCard label="Cargando resumen..." />
      ) : (
        <div style={statsGridStyle}>
          <Stat label="Productos" value={String(products.length)} />
          <Stat label="Categorias" value={String(categories.length)} />
          <Stat label="Clientes" value={String(customers.length)} />
          <Stat
            label="Pedidos pendientes"
            value={String(
              orders.filter((item) =>
                operationalPendingStatuses.has(item.status),
              ).length,
            )}
          />
          <Stat
            label="Envios activos"
            value={String(
              shipments.filter(
                (item) =>
                  !["delivered", "returned", "failed"].includes(item.status),
              ).length,
            )}
          />
          <Stat
            label="Devoluciones abiertas"
            value={String(
              returns.filter((item) => item.status === "requested").length,
            )}
          />
          <Stat
            label="Facturacion"
            value={money(
              orders.reduce((sum, item) => sum + Number(item.total ?? 0), 0),
            )}
          />
        </div>
      )}
    </section>
  );
}

function AdminAccountingSection() {
  const { isTabletOrSmaller, isPhone } = useViewportFlags();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState("all");
  const [provider, setProvider] = useState("all");
  const [method, setMethod] = useState("all");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const downloadExport = async () => {
    try {
      setDownloading(true);
      setError("");
      setSuccess("");

      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (status !== "all") params.set("status", status);
      if (provider !== "all") params.set("provider", provider);
      if (method !== "all") params.set("method", method);

      const blob = await apiBlob(`/orders/accounting/export?${params.toString()}`);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `contable-${from || "inicio"}-${to || "hoy"}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setSuccess("El CSV contable ya se descargo.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo descargar el export contable.",
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section style={panelStyle}>
      <Header
        title="Contabilidad"
        copy="Export simple para contador con ventas, pagos, descuentos, envio y refunds. Pensado para conciliacion y cierre mensual."
      />
      <div
        style={{
          ...twoColumnStyle,
          gridTemplateColumns: isTabletOrSmaller
            ? "minmax(0, 1fr)"
            : twoColumnStyle.gridTemplateColumns,
        }}
      >
        <article
          style={{
            ...groupPanelStyle,
            padding: isPhone ? 18 : groupPanelStyle.padding,
            minWidth: 0,
          }}
        >
          <p style={eyebrowStyle}>Filtros</p>
          <h3 style={title3Style}>Periodo de exportacion</h3>
          <label style={shellStyle}>
            <span style={metaStyle}>Desde</span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              style={fieldStyle}
            />
          </label>
          <label style={shellStyle}>
            <span style={metaStyle}>Hasta</span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              style={fieldStyle}
            />
          </label>
          <label style={shellStyle}>
            <span style={metaStyle}>Estado</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              style={selectStyle}
            >
              <option value="all" style={optionStyle}>
                Todos
              </option>
              {statuses.map((item) => (
                <option key={item} value={item} style={optionStyle}>
                  {orderStatusLabel(item)}
                </option>
              ))}
              <option value="refunded" style={optionStyle}>
                Reintegrado
              </option>
            </select>
          </label>
          <label style={shellStyle}>
            <span style={metaStyle}>Proveedor de pago</span>
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              style={selectStyle}
            >
              <option value="all" style={optionStyle}>
                Todos
              </option>
              <option value="mercadopago" style={optionStyle}>
                Mercado Pago
              </option>
              <option value="bank_transfer" style={optionStyle}>
                Transferencia
              </option>
              <option value="manual" style={optionStyle}>
                Venta manual
              </option>
            </select>
          </label>
          <label style={shellStyle}>
            <span style={metaStyle}>Metodo</span>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              style={selectStyle}
            >
              <option value="all" style={optionStyle}>
                Todos
              </option>
              <option value="card" style={optionStyle}>
                Tarjeta
              </option>
              <option value="bank_transfer" style={optionStyle}>
                Transferencia
              </option>
              <option value="cash" style={optionStyle}>
                Efectivo
              </option>
              <option value="manual" style={optionStyle}>
                Manual
              </option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void downloadExport()}
            disabled={downloading}
            style={primaryButtonStyle}
          >
            {downloading ? "Generando..." : "Descargar CSV contable"}
          </button>
          {error ? <p style={errorStyle}>{error}</p> : null}
          {success ? <p style={successStyle}>{success}</p> : null}
        </article>
        <article
          style={{
            ...groupPanelStyle,
            padding: isPhone ? 18 : groupPanelStyle.padding,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <p style={eyebrowStyle}>Columnas</p>
          <h3 style={title3Style}>Que incluye</h3>
          <div style={{ ...shellStyle, minWidth: 0 }}>
            {[
              "Fecha y numero de pedido",
              "Estado del pedido",
              "Cliente y email snapshot",
              "Subtotal, descuento, envio y total",
              "Proveedor, metodo, estado y monto del pago",
              "Referencia externa y merchant order de Mercado Pago",
              "Cuotas, tipo y detalle de estado del pago",
              "Cantidad y monto de refunds",
              "Filtros por proveedor o metodo cuando haga falta separar conciliaciones",
            ].map((item) => (
              <div
                key={item}
                style={{
                  ...checkStyle,
                  alignItems: "flex-start",
                  minWidth: 0,
                }}
              >
                <span style={softChipStyle}>CSV</span>
                <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{item}</span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function AdminLabelsSection() {
  return <AdminLabelsGenerator />;
}

function AdminDeveloperSection({
  user,
  onBack,
}: {
  user: Props["user"];
  onBack: () => void;
}) {
  return (
    <section style={panelStyle}>
      <Header
        title="Modo desarrollador"
        copy="Edita bloques, fondos, textos y productos destacados de la home."
        actions={
          <button type="button" onClick={onBack} style={secondaryButtonStyle}>
            Volver al panel general
          </button>
        }
      />
      <DeveloperModePanel user={user} forceExpanded />
    </section>
  );
}

type ProductAdminTab =
  | "catalog"
  | "create"
  | "options"
  | "categories";

function getProductTotalStock(product: Product) {
  return (product.variants ?? []).reduce(
    (sum, variant) =>
      sum + Number(variant.inventories?.[0]?.quantity ?? 0),
    0,
  );
}

function getProductPriceFrom(product: Product) {
  const prices = (product.variants ?? [])
    .map((variant) => Number(variant.price ?? 0))
    .filter((price) => Number.isFinite(price) && price > 0);

  return prices.length > 0 ? Math.min(...prices) : 0;
}

function getProductCatalogStatus(product: Product) {
  if (getProductTotalStock(product) <= 0) return "Sin stock";
  return product.published ? "Publicado" : "Borrador";
}

function getProductCategoryNames(product: Product) {
  return (product.categories ?? []).map((entry) => entry.category.name);
}

function nextClothingSize(size: string) {
  const sequence = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
  const current = size.trim().toUpperCase();
  const index = sequence.indexOf(current);
  if (index >= 0 && index < sequence.length - 1) return sequence[index + 1];
  return current ? `${current} COPIA` : "";
}

function splitVariantValues(value: string) {
  return [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function normalizeComparableName(value: string) {
  return value.trim().toLocaleLowerCase("es-AR");
}

function attributeSaveErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message.toLowerCase().includes("product option already exists")) {
    return "Ya existe un atributo con ese nombre. Usá el existente o elegí otro nombre.";
  }

  return message || "No se pudo guardar el atributo.";
}

function AdminProductsSection({
  initialTab = "catalog",
}: {
  initialTab?: ProductAdminTab;
}) {
  const { isTabletOrSmaller, isPhone } = useViewportFlags();
  const searchParams = useSearchParams();
  const formTopRef = useRef<HTMLDivElement | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState<{
    total: number;
    uploaded: number;
  } | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<number | null>(null);
  const [creatingOption, setCreatingOption] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null,
  );
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeTab, setActiveTab] = useState<ProductAdminTab>(initialTab);
  const [wizardStep, setWizardStep] = useState<ProductWizardStep>("info");
  const [newOptionName, setNewOptionName] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productStatusFilter, setProductStatusFilter] = useState<"all" | "published" | "draft" | "without-stock">("all");
  const [optionQuery, setOptionQuery] = useState("");
  const [attributeDraft, setAttributeDraft] = useState<AttributeDraft | null>(null);
  const [draggingAttributeValueId, setDraggingAttributeValueId] = useState<number | null>(null);
  const [editingValueKey, setEditingValueKey] = useState<string | null>(null);
  const [editingValueName, setEditingValueName] = useState("");
  const [savingOptionKey, setSavingOptionKey] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] =
    useState<PendingOptionRemoval | null>(null);
  const [duplicateSkuPrompt, setDuplicateSkuPrompt] =
    useState<DuplicateSkuPromptState | null>(null);
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(
    null,
  );
  const [variantDraftInitialState, setVariantDraftInitialState] =
    useState<EditableVariant | null>(null);
  const [pendingVariantSwitch, setPendingVariantSwitch] =
    useState<PendingVariantSwitchState | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    published: false,
    weightGrams: "",
    packageHeightCm: "",
    packageWidthCm: "",
    packageLengthCm: "",
  });
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategoryInline, setCreatingCategoryInline] = useState(false);
  const [packagingTemplateId, setPackagingTemplateId] = useState("");
  const [selectedVariantIndexes, setSelectedVariantIndexes] = useState<number[]>([]);
  const [bulkVariantPatch, setBulkVariantPatch] = useState({
    price: "",
    stock: "",
    color: "",
    size: "",
  });
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [autoOpenedProductId, setAutoOpenedProductId] = useState<number | null>(
    null,
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [imageFiles, setImageFiles] = useState<UploadImage[]>([]);
  const [existingImages, setExistingImages] = useState<ExistingProductImage[]>(
    [],
  );
  const [originalImageIds, setOriginalImageIds] = useState<number[]>([]);
  const [imageGridLines, setImageGridLines] = useState(5);
  const [selectedOptionValues, setSelectedOptionValues] = useState<
    Record<number, string[]>
  >({});
  const [selectedVariantAttributeIds, setSelectedVariantAttributeIds] = useState<number[]>([]);
  const [loadedOptionValues, setLoadedOptionValues] = useState<
    ProductOptionValueEntry[]
  >([]);
  const [draftOptionValues, setDraftOptionValues] = useState<
    Record<number, string>
  >({});
  const [variantDraft, setVariantDraft] =
    useState<EditableVariant>(emptyVariant());
  const [variants, setVariants] = useState<EditableVariant[]>([]);
  const uploadImagesRef = useRef<UploadImage[]>([]);
  const imageQueueRunningRef = useRef(false);
  const imageDraftCreationRef = useRef(false);

  const stackedSectionStyle: React.CSSProperties = {
    ...tableSectionStyle,
    padding: isPhone ? 18 : 24,
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  };
  const responsiveShellStyle: React.CSSProperties = {
    ...shellStyle,
    gap: isPhone ? 14 : 18,
    minWidth: 0,
    width: "100%",
  };
  const responsiveTopGridStyle: React.CSSProperties = {
    ...topGridStyle,
    gridTemplateColumns: isTabletOrSmaller
      ? "minmax(0, 1fr)"
      : topGridStyle.gridTemplateColumns,
    minWidth: 0,
  };
  const responsiveVariantGridStyle: React.CSSProperties = {
    ...variantGridStyle,
    gridTemplateColumns: isPhone
      ? "minmax(0, 1fr)"
      : variantGridStyle.gridTemplateColumns,
    minWidth: 0,
  };
  const responsiveImageEditorGridStyle: React.CSSProperties = {
    ...imageEditorGridStyle,
    gridTemplateColumns: isPhone
      ? "minmax(0, 1fr)"
      : imageEditorGridStyle.gridTemplateColumns,
    minWidth: 0,
  };
  const responsiveOptionGridStyle: React.CSSProperties = {
    ...optionGridStyle,
    gridTemplateColumns: isPhone
      ? "minmax(0, 1fr)"
      : optionGridStyle.gridTemplateColumns,
    minWidth: 0,
  };
  const responsiveSearchFieldStyle: React.CSSProperties = {
    ...searchFieldStyle,
    minWidth: isTabletOrSmaller ? 0 : searchFieldStyle.minWidth,
    width: isTabletOrSmaller ? "100%" : undefined,
    flex: isTabletOrSmaller ? "1 1 100%" : "1 1 280px",
  };
  const responsiveSelectStyle: React.CSSProperties = {
    ...selectStyle,
    width: isTabletOrSmaller ? "100%" : selectStyle.width,
    maxWidth: isTabletOrSmaller ? "100%" : selectStyle.maxWidth,
  };
  const responsiveTabRailStyle: React.CSSProperties = {
    ...tabRailStyle,
    flexWrap: "nowrap",
    overflowX: "auto",
    overflowY: "hidden",
    paddingBottom: 6,
    scrollbarWidth: "thin",
    maxWidth: "100%",
    minWidth: 0,
  };

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadOptions = async () => {
    const optionsData = await api("/product-options");
    const nextOptions = Array.isArray(optionsData) ? optionsData : [];
    setOptions(nextOptions);
    return nextOptions;
  };

  const loadData = async (): Promise<Product[]> => {
    setLoading(true);
    try {
      const [p, c, o] = await Promise.all([
        api("/products"),
        api("/categories"),
        api("/product-options"),
      ]);
      const nextProducts = Array.isArray(p) ? p : [];
      setProducts(nextProducts);
      setCategories(Array.isArray(c) ? scopeCategoriesToActiveStore(c as Category[]) : []);
      setOptions(Array.isArray(o) ? o : []);
      return nextProducts;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar productos.",
      );
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    uploadImagesRef.current = imageFiles;
  }, [imageFiles]);

  useEffect(() => {
    return () => {
      revokeUploadImages(uploadImagesRef.current);
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const rawProductId = searchParams.get("productId");
    const nextProductId = rawProductId ? Number(rawProductId) : NaN;

    if (!Number.isFinite(nextProductId) || nextProductId <= 0) {
      setAutoOpenedProductId(null);
      return;
    }

    if (loading || autoOpenedProductId === nextProductId) {
      return;
    }

    const productToEdit = products.find(
      (product) => product.id === nextProductId,
    );
    if (!productToEdit) {
      return;
    }

    setActiveTab("create");
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setAutoOpenedProductId(nextProductId);
    void hydrateFormFromProduct(productToEdit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenedProductId, loading, products, searchParams]);

  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();

    return products.filter((product) => {
      const categoryText = (product.categories ?? [])
        .map((entry) => entry.category.name)
        .join(" ")
        .toLowerCase();
      const tagText = (product as Product & { optionValues?: Array<{ value?: string }> }).optionValues
        ?.map((entry) => entry.value ?? "")
        .join(" ")
        .toLowerCase() ?? "";
      const totalStock = getProductTotalStock(product);
      const matchesQuery =
        !query ||
        product.title.toLowerCase().includes(query) ||
        product.slug.toLowerCase().includes(query) ||
        categoryText.includes(query) ||
        tagText.includes(query);
      const matchesCategory =
        productCategoryFilter === "all" ||
        (product.categories ?? []).some((entry) => String(entry.category.id) === productCategoryFilter);
      const matchesStatus =
        productStatusFilter === "all" ||
        (productStatusFilter === "published"
          ? product.published && totalStock > 0
          : productStatusFilter === "draft"
            ? !product.published && totalStock > 0
            : totalStock <= 0);

      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [productCategoryFilter, productQuery, productStatusFilter, products]);

  const productMetrics = useMemo(
    () => ({
      total: products.length,
      published: products.filter((product) => product.published).length,
      draft: products.filter((product) => !product.published).length,
      withoutStock: products.filter((product) => getProductTotalStock(product) <= 0).length,
    }),
    [products],
  );

  const filteredOptions = useMemo(() => {
    const query = optionQuery.trim().toLowerCase();

    if (!query) {
      return options;
    }

    return options.filter((option) => {
      const valuesText = (option.reusableValues ?? [])
        .map((value) => value.value)
        .join(" ")
        .toLowerCase();

      return (
        option.name.toLowerCase().includes(query) || valuesText.includes(query)
      );
    });
  }, [optionQuery, options]);

  const variantAutocomplete = useMemo(() => {
    const collect = (selector: (variant: EditableVariant) => string) => [
      ...new Set(
        variants.map((variant) => selector(variant).trim()).filter(Boolean),
      ),
    ];

    return {
      sku: collect((variant) => variant.sku),
      price: collect((variant) => variant.price),
      size: collect((variant) => variant.Size),
      color: collect((variant) => variant.Color),
      inventoryQuantity: collect((variant) => variant.inventoryQuantity),
      weight: collect((variant) => variant.weight),
      width: collect((variant) => variant.width),
      height: collect((variant) => variant.height),
      length: collect((variant) => variant.length),
    };
  }, [variants]);

  const pendingImageCount = useMemo(
    () =>
      imageFiles.filter(
        (entry) => entry.status === "pending" || entry.status === "error",
      ).length,
    [imageFiles],
  );
  const failedImageCount = useMemo(
    () => imageFiles.filter((entry) => entry.status === "error").length,
    [imageFiles],
  );

  const resetForm = () => {
    revokeUploadImages(imageFiles);
    setEditingProductId(null);
    setForm({
      title: "",
      description: "",
      published: false,
      weightGrams: "",
      packageHeightCm: "",
      packageWidthCm: "",
      packageLengthCm: "",
    });
    setSelectedCategoryIds([]);
    setImageFiles([]);
    setExistingImages([]);
    setOriginalImageIds([]);
    setSelectedOptionValues({});
    setSelectedVariantAttributeIds([]);
    setLoadedOptionValues([]);
    setDraftOptionValues({});
    setVariantDraft(emptyVariant());
    setEditingVariantIndex(null);
    setVariantDraftInitialState(null);
    setPendingVariantSwitch(null);
    setVariants([]);
    setWizardStep("info");
    setPackagingTemplateId("");
    setSelectedVariantIndexes([]);
    setBulkVariantPatch({ price: "", stock: "", color: "", size: "" });
    setImageUploadProgress(null);
    setAttributeDraft(null);
  };

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setToast({ id: Date.now(), message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 2000);
  };

  const startNewProduct = () => {
    resetForm();
    setActiveTab("create");
    setWizardStep("info");
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const exitProductWizard = () => {
    resetForm();
    setActiveTab("catalog");
  };

  const toggleCategory = (categoryId: number) => {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  };

  const toggleOptionValue = (optionId: number, value: string) => {
    setSelectedOptionValues((current) => {
      const values = current[optionId] ?? [];
      const next = values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value];
      if (next.length === 0) {
        const clone = { ...current };
        delete clone[optionId];
        return clone;
      }
      return { ...current, [optionId]: next };
    });
  };

  const toggleVariantAttribute = (optionId: number) => {
    setSelectedVariantAttributeIds((current) => {
      if (current.includes(optionId)) {
        return current.filter((id) => id !== optionId);
      }

      return [...current, optionId];
    });
  };

  const removeOptionValueFromProduct = async (
    optionId: number,
    value: string,
  ) => {
    setSelectedOptionValues((current) => {
      const currentValues = current[optionId] ?? [];
      const next = currentValues.filter((item) => item !== value);

      if (next.length === 0) {
        const clone = { ...current };
        delete clone[optionId];
        return clone;
      }

      return { ...current, [optionId]: next };
    });

    if (!editingProductId) {
      return;
    }

    const existingValue = loadedOptionValues.find(
      (entry) =>
        entry.productOptionId === optionId &&
        entry.value.trim().toLowerCase() === value.trim().toLowerCase(),
    );

    if (!existingValue) {
      return;
    }

    try {
      await api(
        `/products/${editingProductId}/option-values/${existingValue.id}`,
        {
          method: "DELETE",
        },
      );

      setLoadedOptionValues((current) =>
        current.filter((entry) => entry.id !== existingValue.id),
      );
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo quitar el valor del producto.",
      );
    }
  };

  const addOptionValue = async (optionId: number) => {
    const value = draftOptionValues[optionId]?.trim();
    if (!value) return;

    const normalizedValue = value.toLowerCase();
    const option = options.find((item) => item.id === optionId);
    const alreadyExists = (option?.reusableValues ?? []).some(
      (item) => item.value.trim().toLowerCase() === normalizedValue,
    );

    if (!alreadyExists) {
      setOptions((current) =>
        current.map((currentOption) => {
          if (currentOption.id !== optionId) {
            return currentOption;
          }

          return {
            ...currentOption,
            reusableValues: [
              ...(currentOption.reusableValues ?? []),
              { id: Date.now(), value, position: currentOption.reusableValues?.length ?? 0 },
            ],
          };
        }),
      );
    }

    setSelectedOptionValues((current) => {
      const currentValues = current[optionId] ?? [];
      if (currentValues.includes(value)) {
        return current;
      }
      return { ...current, [optionId]: [...currentValues, value] };
    });

    setDraftOptionValues((current) => ({ ...current, [optionId]: "" }));

    if (!editingProductId || alreadyExists) {
      return;
    }

    try {
      const created = await api(`/products/${editingProductId}/option-values`, {
        method: "POST",
        body: JSON.stringify({ productOptionId: optionId, value }),
      });

      setLoadedOptionValues((current) => [
        ...current,
        {
          id: created.id,
          productOptionId: created.productOptionId,
          value: created.value,
        },
      ]);

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar el valor del atributo.",
      );
    }
  };

  const createReusableAttributeValue = async (optionId: number, explicitValue?: string, explicitColor?: string) => {
    const value = (explicitValue ?? draftOptionValues[optionId] ?? "").trim();
    if (!value) return;

    try {
      await api(`/product-options/${optionId}/reusable-values`, {
        method: "POST",
        body: JSON.stringify({ value, visualColor: explicitColor || undefined }),
      });
      setDraftOptionValues((current) => ({ ...current, [optionId]: "" }));
      await loadOptions();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "No se pudo crear el valor.");
    }
  };

  const reorderAttributeValue = async (
    optionId: number,
    draggedValueId: number,
    targetValueId: number,
  ) => {
    if (draggedValueId === targetValueId) return;
    const option = options.find((item) => item.id === optionId);
    const values = option?.reusableValues ?? [];
    const from = values.findIndex((value) => value.id === draggedValueId);
    const to = values.findIndex((value) => value.id === targetValueId);
    if (from < 0 || to < 0) return;

    const nextValues = [...values];
    const [moved] = nextValues.splice(from, 1);
    nextValues.splice(to, 0, moved);
    setOptions((current) =>
      current.map((item) =>
        item.id === optionId ? { ...item, reusableValues: nextValues } : item,
      ),
    );

    try {
      await api(`/product-options/${optionId}/reusable-values/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ valueIds: nextValues.map((value) => value.id) }),
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "No se pudo ordenar.");
      await loadOptions();
    }
  };

  const unlinkAttributeFromProduct = async (option: ProductOption, product: { id: number; title: string }) => {
    const confirmed = window.confirm(
      `Desea quitar el atributo "${option.name}" del producto "${product.title}"?\n\nEsta accion puede afectar variantes existentes y filtros asociados.`,
    );
    if (!confirmed) return;

    try {
      await api(`/product-options/${option.id}/products/${product.id}`, { method: "DELETE" });
      await loadOptions();
      showToast("Atributo desvinculado del producto.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "No se pudo quitar el atributo.");
    }
  };

  const createCategoryInline = async () => {
    const name = newCategoryName.trim();
    if (!name) return;

    try {
      setCreatingCategoryInline(true);
      setError("");
      const created = await api("/categories", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      const nextCategory = created as Category;
      setCategories((current) => [...current, nextCategory]);
      setSelectedCategoryIds((current) => [...new Set([...current, nextCategory.id])]);
      setNewCategoryName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la categoria.");
    } finally {
      setCreatingCategoryInline(false);
    }
  };

  const applyPackagingTemplate = (templateId: string) => {
    setPackagingTemplateId(templateId);
    const template = packagingTemplates.find((item) => item.id === templateId);
    if (!template) return;

    setForm((current) => ({
      ...current,
      weightGrams: template.weight,
      packageWidthCm: template.width,
      packageHeightCm: template.height,
      packageLengthCm: template.length,
    }));
  };

  const normalizeVariant = (variant: EditableVariant): EditableVariant => ({
    id: variant.id,
    sku: variant.sku.trim(),
    price: variant.price.trim(),
    Size: variant.Size.trim(),
    Color: variant.Color.trim(),
    inventoryQuantity: variant.inventoryQuantity.trim(),
    weight: variant.weight.trim(),
    width: variant.width.trim(),
    height: variant.height.trim(),
    length: variant.length.trim(),
  });

  const isVariantEmpty = useCallback((variant: EditableVariant) => {
    const normalized = normalizeVariant(variant);
    return ![
      normalized.sku,
      normalized.price,
      normalized.Size,
      normalized.Color,
      normalized.inventoryQuantity,
      normalized.weight,
      normalized.width,
      normalized.height,
      normalized.length,
    ].some(Boolean);
  }, []);

  const variantDraftIsDirty = useMemo(() => {
    const normalizedDraft = normalizeVariant(variantDraft);

    if (editingVariantIndex !== null && variantDraftInitialState) {
      const normalizedInitial = normalizeVariant(variantDraftInitialState);
      return (
        normalizedDraft.sku !== normalizedInitial.sku ||
        normalizedDraft.price !== normalizedInitial.price ||
        normalizedDraft.Size !== normalizedInitial.Size ||
        normalizedDraft.Color !== normalizedInitial.Color ||
        normalizedDraft.inventoryQuantity !== normalizedInitial.inventoryQuantity ||
        normalizedDraft.weight !== normalizedInitial.weight ||
        normalizedDraft.width !== normalizedInitial.width ||
        normalizedDraft.height !== normalizedInitial.height ||
        normalizedDraft.length !== normalizedInitial.length
      );
    }

    return !isVariantEmpty(normalizedDraft);
  }, [editingVariantIndex, isVariantEmpty, variantDraft, variantDraftInitialState]);

  const isDuplicateSkuError = (message: string) => {
    const normalized = message.trim().toLowerCase();
    return normalized.includes("sku already exists");
  };

  const buildAutomaticSku = (
    productTitle: string,
    variant: EditableVariant,
    index: number,
    seed: number,
  ) => {
    const base = [productTitle, variant.Size, variant.Color]
      .filter(Boolean)
      .join(" ")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 36);

    const prefix = base || "trojani";
    return `${prefix}-${seed}-${index + 1}`;
  };

  const generateAutomaticSkus = (variantsToUpdate: EditableVariant[]) => {
    const seed = Date.now().toString().slice(-6);
    return variantsToUpdate.map((variant, index) => ({
      ...variant,
      sku: buildAutomaticSku(form.title.trim(), variant, index, Number(seed)),
    }));
  };

  const loadVariantIntoDraft = useCallback((index: number) => {
    const selected = variants[index];

    if (!selected) {
      setVariantDraft(emptyVariant());
      setEditingVariantIndex(null);
      setVariantDraftInitialState(null);
      return;
    }

    const normalized = normalizeVariant(selected);
    setVariantDraft(normalized);
    setEditingVariantIndex(index);
    setVariantDraftInitialState(normalized);
  }, [variants]);

  const requestEditVariant = (index: number) => {
    if (index === editingVariantIndex) {
      return;
    }

    if (variantDraftIsDirty) {
      setPendingVariantSwitch({ nextIndex: index });
      return;
    }

    loadVariantIntoDraft(index);
  };

  const clearVariantDraft = useCallback(() => {
    setVariantDraft(emptyVariant());
    setEditingVariantIndex(null);
    setVariantDraftInitialState(null);
  }, []);

  const addVariant = () => {
    const normalized = normalizeVariant(variantDraft);

    if (!normalized.sku || parsePriceInput(normalized.price) <= 0) {
      showToast("Cada variante necesita SKU y precio.");
      setError("");
      return false;
    }

    const duplicateIndex = variants.findIndex(
      (item, itemIndex) =>
        item.sku.trim().toLowerCase() === normalized.sku.toLowerCase() &&
        item.id !== normalized.id &&
        itemIndex !== editingVariantIndex,
    );

    if (duplicateIndex >= 0) {
      showToast("Ya existe otra variante con ese SKU.");
      setError("");
      return false;
    }

    setVariants((current) => {
      if (
        editingVariantIndex !== null &&
        editingVariantIndex >= 0 &&
        editingVariantIndex < current.length
      ) {
        const next = [...current];
        next[editingVariantIndex] = normalized;
        return next;
      }

      return [...current, normalized];
    });

    clearVariantDraft();
    setError("");
    return true;
  };

  const generateVariantsFromMatrix = () => {
    const selectedAttributes = options.filter((option) =>
      selectedVariantAttributeIds.includes(option.id),
    );
    const selectedValuesByAttribute = selectedAttributes.map((option) => ({
      option,
      values: selectedOptionValues[option.id] ?? [],
    })).filter((entry) => entry.values.length > 0);

    const colorDraftValues = splitVariantValues(variantDraft.Color);
    const sizeDraftValues = splitVariantValues(variantDraft.Size);
    const hasColorAttribute = selectedValuesByAttribute.some(
      (entry) => entry.option.name.trim().toLowerCase() === "color",
    );
    const hasSizeAttribute = selectedValuesByAttribute.some((entry) =>
      ["talle", "talles", "size", "sizes"].includes(
        entry.option.name.trim().toLowerCase(),
      ),
    );
    const matrixValues = [
      ...selectedValuesByAttribute,
      ...(!hasColorAttribute && colorDraftValues.length > 0
        ? [{ option: { id: -1, name: "Color" }, values: colorDraftValues }]
        : []),
      ...(!hasSizeAttribute && sizeDraftValues.length > 0
        ? [{ option: { id: -2, name: "Talle" }, values: sizeDraftValues }]
        : []),
    ];

    if (matrixValues.length === 0) {
      showToast("Elegí al menos un atributo y sus valores.");
      return;
    }

    const basePrice = variantDraft.price.trim() || variants[0]?.price || "";
    const baseStock = variantDraft.inventoryQuantity.trim() || "0";
    const baseGarmentWidth = variantDraft.width.trim();
    const baseGarmentLength = variantDraft.length.trim();
    const slugBase = form.title.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "producto";
    const combinations = matrixValues.reduce<string[][]>(
      (acc, entry) => acc.flatMap((combo) => entry.values.map((value) => [...combo, value])),
      [[]],
    );

    const generated = combinations.map((combo) => {
        const colorIndex = matrixValues.findIndex((entry) => entry.option.name.trim().toLowerCase() === "color");
        const sizeIndex = matrixValues.findIndex((entry) => ["talle", "talles", "size", "sizes"].includes(entry.option.name.trim().toLowerCase()));
        const parts = [slugBase, ...combo]
          .filter(Boolean)
          .map((part) => part.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 12));

        return {
          sku: parts.join("-").toUpperCase(),
          price: basePrice,
          Size: sizeIndex >= 0 ? combo[sizeIndex] : "",
          Color: colorIndex >= 0 ? combo[colorIndex] : "",
          inventoryQuantity: baseStock,
          weight: "",
          width: baseGarmentWidth,
          height: "",
          length: baseGarmentLength,
        };
    });

    setVariants((current) => {
      const existingKeys = new Set(current.map((variant) => variant.sku.trim().toLowerCase()));
      const next = generated.filter((variant) => !existingKeys.has(variant.sku.trim().toLowerCase()));
      return [...current, ...next];
    });
  };

  const toggleVariantSelection = (index: number) => {
    setSelectedVariantIndexes((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    );
  };

  const applyBulkVariantPatch = () => {
    if (selectedVariantIndexes.length === 0) return;

    setVariants((current) =>
      current.map((variant, index) => {
        if (!selectedVariantIndexes.includes(index)) return variant;
        return {
          ...variant,
          price: bulkVariantPatch.price.trim() || variant.price,
          inventoryQuantity: bulkVariantPatch.stock.trim() || variant.inventoryQuantity,
          Color: bulkVariantPatch.color.trim() || variant.Color,
          Size: bulkVariantPatch.size.trim() || variant.Size,
        };
      }),
    );
  };

  const updateVariantAt = (index: number, patch: Partial<EditableVariant>) => {
    setVariants((current) =>
      current.map((variant, itemIndex) =>
        itemIndex === index ? { ...variant, ...patch } : variant,
      ),
    );
  };

  const duplicateVariantSmart = (index: number) => {
    const source = variants[index];
    if (!source) return;

    const nextSize = nextClothingSize(source.Size);
    const duplicate = {
      ...source,
      id: undefined,
      Size: nextSize,
      sku: source.sku ? `${source.sku.replace(/-[^-]*$/u, "")}-${nextSize || "COPIA"}` : "",
    };

    setVariants((current) => [...current.slice(0, index + 1), duplicate, ...current.slice(index + 1)]);
  };

  const handleVariantDiscard = useCallback(() => {
    const nextIndex = pendingVariantSwitch?.nextIndex ?? null;
    clearVariantDraft();
    setPendingVariantSwitch(null);
    if (nextIndex !== null) {
      loadVariantIntoDraft(nextIndex);
    }
  }, [clearVariantDraft, loadVariantIntoDraft, pendingVariantSwitch]);

  const handleVariantSaveAndContinue = () => {
    const nextIndex = pendingVariantSwitch?.nextIndex ?? null;
    const saved = addVariant();

    if (!saved) {
      return;
    }

    setPendingVariantSwitch(null);
    if (nextIndex !== null) {
      loadVariantIntoDraft(nextIndex);
    }
  };

  const buildVariantsToPersist = () => {
    const draftIsEmpty = isVariantEmpty(variantDraft);
    const normalizedDraft = normalizeVariant(variantDraft);
    let nextVariants = [...variants];
    const shouldPersistDraft =
      !draftIsEmpty &&
      (Boolean(normalizedDraft.sku.trim()) || editingVariantIndex !== null);

    if (shouldPersistDraft) {
      if (!normalizedDraft.sku || parsePriceInput(normalizedDraft.price) <= 0) {
        throw new Error("Cada variante necesita al menos SKU y precio.");
      }

      const duplicateIndex = nextVariants.findIndex(
        (item, itemIndex) =>
          item.sku.trim().toLowerCase() === normalizedDraft.sku.toLowerCase() &&
          item.id !== normalizedDraft.id &&
          itemIndex !== editingVariantIndex,
      );

      if (duplicateIndex >= 0) {
        throw new Error("Ya existe otra variante con ese SKU.");
      }

      if (
        editingVariantIndex !== null &&
        editingVariantIndex >= 0 &&
        editingVariantIndex < nextVariants.length
      ) {
        nextVariants[editingVariantIndex] = normalizedDraft;
      } else {
        nextVariants = [...nextVariants, normalizedDraft];
      }
    }

    return nextVariants;
  };

  const createOption = async () => {
    const name = newOptionName.trim();
    if (!name) return;
    const alreadyExists = options.some(
      (option) => normalizeComparableName(option.name) === normalizeComparableName(name),
    );

    if (alreadyExists) {
      const message = "Ya existe un atributo con ese nombre. Usá el existente o elegí otro nombre.";
      setError(message);
      showToast(message);
      return;
    }

    try {
      setCreatingOption(true);
      await api("/product-options", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      await loadOptions();
      setNewOptionName("");
    } catch (err) {
      const message = attributeSaveErrorMessage(err);
      setError(message);
      showToast(message);
    } finally {
      setCreatingOption(false);
    }
  };

  const openAttributeModal = (option?: ProductOption) => {
    setAttributeDraft({
      id: option?.id ?? null,
      name: option?.name ?? "",
      attributeType: option?.attributeType ?? (option?.name.trim().toLowerCase() === "color" ? "color" : "text"),
      newValue: "",
      newValueColor: "#000000",
      bulkValues: "",
    });
    setEditingValueKey(null);
    setEditingValueName("");
  };

  const closeAttributeModal = () => {
    setAttributeDraft(null);
    setDraggingAttributeValueId(null);
    setEditingValueKey(null);
    setEditingValueName("");
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (pendingRemoval) {
        setPendingRemoval(null);
        return;
      }

      if (duplicateSkuPrompt) {
        setDuplicateSkuPrompt(null);
        return;
      }

      if (attributeDraft) {
        closeAttributeModal();
        return;
      }

      if (pendingVariantSwitch || editingVariantIndex !== null) {
        handleVariantDiscard();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [
    attributeDraft,
    duplicateSkuPrompt,
    editingVariantIndex,
    handleVariantDiscard,
    pendingRemoval,
    pendingVariantSwitch,
  ]);

  const saveAttributeDraft = async () => {
    if (!attributeDraft?.name.trim()) {
      showToast("El atributo necesita un nombre.");
      return;
    }

    const attributeName = attributeDraft.name.trim();
    const alreadyExists = options.some(
      (option) =>
        option.id !== attributeDraft.id &&
        normalizeComparableName(option.name) === normalizeComparableName(attributeName),
    );

    if (alreadyExists) {
      showToast("Ya existe un atributo con ese nombre. Usá el existente o elegí otro nombre.");
      return;
    }

    try {
      const payload = {
        name: attributeName,
        attributeType: attributeDraft.attributeType,
      };
      const isCreating = !attributeDraft.id;
      const saved = attributeDraft.id
        ? await api(`/product-options/${attributeDraft.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await api("/product-options", {
            method: "POST",
            body: JSON.stringify(payload),
          });
      const optionId = Number(saved?.id ?? attributeDraft.id);
      const values = attributeDraft.bulkValues
        .split(/[\n,;]+/u)
        .map((value) => value.trim())
        .filter(Boolean);

      for (const value of values) {
        await api(`/product-options/${optionId}/reusable-values`, {
          method: "POST",
          body: JSON.stringify({ value }),
        });
      }

      await loadOptions();
      closeAttributeModal();
      showToast(isCreating ? "Atributo creado." : "Atributo actualizado.");
    } catch (err) {
      showToast(attributeSaveErrorMessage(err));
    }
  };

  const removeOption = async (
    optionId: number,
    optionName: string,
    productsCount: number,
  ) => {
    const isInUse = productsCount > 0;
    try {
      setSavingOptionKey(`option-${optionId}`);
      setError("");
      await api(`/product-options/${optionId}${isInUse ? "?force=true" : ""}`, {
        method: "DELETE",
      });
      await loadOptions();
      setSuccess(
        isInUse
          ? "Atributo eliminado de todos los productos."
          : "Atributo eliminado.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo eliminar el atributo.",
      );
    } finally {
      setSavingOptionKey(null);
    }
  };

  const startEditingValue = (optionId: number, value: string) => {
    setEditingValueKey(`${optionId}:${value.toLowerCase()}`);
    setEditingValueName(value);
  };

  const saveOptionValue = async (optionId: number, currentValue: string) => {
    const nextValue = editingValueName.trim();
    if (!nextValue) {
      setError("El valor no puede quedar vacio.");
      return;
    }

    try {
      setSavingOptionKey(`value-${optionId}:${currentValue.toLowerCase()}`);
      setError("");
      await api(`/product-options/${optionId}/reusable-values/rename`, {
        method: "POST",
        body: JSON.stringify({
          currentValue,
          nextValue,
        }),
      });
      await loadOptions();
      setEditingValueKey(null);
      setEditingValueName("");
      setSuccess("Valor actualizado.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo actualizar el valor.",
      );
    } finally {
      setSavingOptionKey(null);
    }
  };

  const removeOptionValue = async (
    optionId: number,
    value: string,
    productsCount: number,
  ) => {
    const isInUse = productsCount > 0;
    try {
      setSavingOptionKey(`value-${optionId}:${value.toLowerCase()}`);
      setError("");
      await api(`/product-options/${optionId}/reusable-values/remove`, {
        method: "POST",
        body: JSON.stringify({
          value,
          force: isInUse,
        }),
      });
      const updatedOptions = await loadOptions();
      const updatedOption = updatedOptions.find(
        (option) => option.id === optionId,
      );

      if (updatedOption && (updatedOption.reusableValues?.length ?? 0) === 0) {
        setSuccess(
          `Valor eliminado. El atributo "${updatedOption.name}" sigue creado.`,
        );
      } else {
        setSuccess(
          isInUse
            ? "Valor eliminado de todos los productos."
            : "Valor eliminado.",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo eliminar el valor.",
      );
    } finally {
      setSavingOptionKey(null);
    }
  };

  const removeProduct = async (productId: number, productTitle: string) => {
    try {
      setSavingOptionKey(`product-${productId}`);
      setError("");
      await api(`/products/${productId}`, {
        method: "DELETE",
      });
      await loadData();
      setSuccess(`Producto "${productTitle}" eliminado.`);
      if (editingProductId === productId) {
        resetForm();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo eliminar el producto.",
      );
    } finally {
      setSavingOptionKey(null);
    }
  };

  const removeCategory = async (categoryId: number, categoryName: string) => {
    try {
      setSavingOptionKey(`category-${categoryId}`);
      setError("");
      await api(`/categories/${categoryId}`, {
        method: "DELETE",
      });
      await loadData();
      setSelectedCategoryIds((current) =>
        current.filter((id) => id !== categoryId),
      );
      setSuccess(`Categoria "${categoryName}" eliminada.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar la categoria.",
      );
    } finally {
      setSavingOptionKey(null);
    }
  };

  const confirmRemoval = async () => {
    if (!pendingRemoval) {
      return;
    }

    if (pendingRemoval.kind === "option") {
      await removeOption(
        pendingRemoval.optionId,
        pendingRemoval.optionName,
        pendingRemoval.productsCount,
      );
    } else if (pendingRemoval.kind === "value") {
      await removeOptionValue(
        pendingRemoval.optionId,
        pendingRemoval.value,
        pendingRemoval.productsCount,
      );
    } else if (pendingRemoval.kind === "variant") {
      const removedIndex = pendingRemoval.variantIndex;
      setVariants((current) =>
        current.filter(
          (_, itemIndex) => itemIndex !== removedIndex,
        ),
      );
      if (editingVariantIndex === removedIndex) {
        clearVariantDraft();
      } else if (editingVariantIndex !== null && editingVariantIndex > removedIndex) {
        setEditingVariantIndex(editingVariantIndex - 1);
      }
      setSuccess("Variante eliminada del borrador actual.");
    } else if (pendingRemoval.kind === "product") {
      await removeProduct(
        pendingRemoval.productId,
        pendingRemoval.productTitle,
      );
    } else {
      await removeCategory(
        pendingRemoval.categoryId,
        pendingRemoval.categoryName,
      );
    }

    setPendingRemoval(null);
  };

  const hydrateFormFromProduct = useCallback(
    async (product: Product) => {
      setLoadingEditId(product.id);
      setError("");
      setSuccess("");

      try {
        const [productImages, productVariants, productOptionValues] =
          await Promise.all([
            api(`/products/${product.id}/images`),
            api(`/variants/${product.id}`),
            api(`/products/${product.id}/option-values`),
          ]);

        setEditingProductId(product.id);
        setForm({
          title: product.title,
          description: product.description ?? "",
          published: product.published,
          weightGrams: String(product.weightGrams ?? ""),
          packageHeightCm: String(product.packageHeightCm ?? ""),
          packageWidthCm: String(product.packageWidthCm ?? ""),
          packageLengthCm: String(product.packageLengthCm ?? ""),
        });
        setPackagingTemplateId(product.packagingTemplateId ?? "");
        setSelectedCategoryIds(
          (product.categories ?? []).map((entry) => entry.category.id),
        );

        const safeImages = Array.isArray(productImages) ? productImages : [];
        revokeUploadImages(imageFiles);
        setExistingImages(
          normalizeImagePositions(
            safeImages
              .map((image, index) => ({
                id: image.id,
                url: image.url,
                position: Number(image.position ?? index),
                offsetX: Number(image.offsetX ?? 0),
                offsetY: Number(image.offsetY ?? 0),
                zoom: Number(image.zoom ?? 1),
              }))
              .sort((a, b) => a.position - b.position),
          ),
        );
        setOriginalImageIds(safeImages.map((image) => image.id));
        setImageFiles([]);

        const safeOptionValues = Array.isArray(productOptionValues)
          ? productOptionValues
          : [];
        setLoadedOptionValues(safeOptionValues);
        setSelectedOptionValues(
          safeOptionValues.reduce<Record<number, string[]>>((acc, item) => {
            acc[item.productOptionId] = [
              ...(acc[item.productOptionId] ?? []),
              item.value,
            ];
            return acc;
          }, {}),
        );
        setSelectedVariantAttributeIds([
          ...new Set(safeOptionValues.map((item) => item.productOptionId)),
        ]);
        setDraftOptionValues({});

        const safeVariants = Array.isArray(productVariants)
          ? productVariants.map((variant) => ({
              id: variant.id,
              sku: String(variant.sku ?? ""),
              price: String(variant.price ?? ""),
              Size: String(variant.Size ?? ""),
              Color: String(variant.Color ?? ""),
              inventoryQuantity: String(
                variant.inventories?.[0]?.quantity ?? "",
              ),
              weight: String(
                variant.weightGrams ??
                  (variant.weight ? Math.round(Number(variant.weight) * 1000) : ""),
              ),
              width: String(variant.width ?? ""),
              height: String(variant.packageHeightCm ?? variant.height ?? ""),
              length: String(variant.length ?? ""),
            }))
          : [];

        setVariants(safeVariants);
        clearVariantDraft();
        setActiveTab("create");
        setWizardStep("info");

        formTopRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar la edicion del producto.",
        );
      } finally {
        setLoadingEditId(null);
      }
    },
    [clearVariantDraft, imageFiles],
  );

  const duplicateProductDraft = useCallback(
    async (product: Product) => {
      setLoadingEditId(product.id);
      setError("");
      setSuccess("");

      try {
        const [productVariants, productOptionValues] = await Promise.all([
          api(`/variants/${product.id}`),
          api(`/products/${product.id}/option-values`),
        ]);

        setEditingProductId(null);
        setForm({
          title: `Copia de ${product.title}`,
          description: product.description ?? "",
          published: false,
          weightGrams: String(product.weightGrams ?? ""),
          packageHeightCm: String(product.packageHeightCm ?? ""),
          packageWidthCm: String(product.packageWidthCm ?? ""),
          packageLengthCm: String(product.packageLengthCm ?? ""),
        });
        setPackagingTemplateId(product.packagingTemplateId ?? "");
        setSelectedCategoryIds(
          (product.categories ?? []).map((entry) => entry.category.id),
        );
        revokeUploadImages(imageFiles);
        setExistingImages([]);
        setOriginalImageIds([]);
        setImageFiles([]);

        const safeOptionValues = Array.isArray(productOptionValues)
          ? productOptionValues
          : [];
        setLoadedOptionValues([]);
        setSelectedOptionValues(
          safeOptionValues.reduce<Record<number, string[]>>((acc, item) => {
            acc[item.productOptionId] = [
              ...(acc[item.productOptionId] ?? []),
              item.value,
            ];
            return acc;
          }, {}),
        );
        setSelectedVariantAttributeIds([
          ...new Set(safeOptionValues.map((item) => item.productOptionId)),
        ]);
        setDraftOptionValues({});

        setVariants(
          Array.isArray(productVariants)
            ? productVariants.map((variant) => ({
                sku: `${String(variant.sku ?? "").trim()}-COPY`,
                price: String(variant.price ?? ""),
                Size: String(variant.Size ?? ""),
                Color: String(variant.Color ?? ""),
                inventoryQuantity: String(
                  variant.inventories?.[0]?.quantity ?? "",
                ),
                weight: String(
                  variant.weightGrams ??
                    (variant.weight ? Math.round(Number(variant.weight) * 1000) : ""),
                ),
                width: String(variant.width ?? ""),
                height: String(variant.packageHeightCm ?? variant.height ?? ""),
                length: String(variant.length ?? ""),
              }))
            : [],
        );
        clearVariantDraft();
        setActiveTab("create");
        setWizardStep("info");
        setSuccess("Copia preparada como borrador. Revisa los SKU antes de guardar.");

        formTopRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo preparar la copia del producto.",
        );
      } finally {
        setLoadingEditId(null);
      }
    },
    [clearVariantDraft, imageFiles],
  );

  const syncExistingImages = async (productId: number) => {
    const imagesToRemove = originalImageIds.filter(
      (id) => !existingImages.some((image) => image.id === id),
    );

    await Promise.all(
      imagesToRemove.map((imageId) =>
        api(`/products/${productId}/images/${imageId}`, { method: "DELETE" }),
      ),
    );

    await Promise.all(
      existingImages.map((image, index) =>
        api(`/products/${productId}/images/${image.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            position: index,
            offsetX: image.offsetX,
            offsetY: image.offsetY,
            zoom: image.zoom,
          }),
        }),
      ),
    );

  };

  const uploadImageWithProgress = (
    productId: number,
    fileEntry: UploadImage,
    position: number,
  ) =>
    new Promise<ExistingProductImage>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const { host, storeId } = getClientStoreContext();
      const formData = new FormData();

      formData.append("file", fileEntry.file);
      formData.append("position", String(position));
      formData.append("offsetX", String(fileEntry.offsetX));
      formData.append("offsetY", String(fileEntry.offsetY));
      formData.append("zoom", String(fileEntry.zoom));

      xhr.open("POST", `/api/proxy/products/${productId}/images/upload`);
      xhr.withCredentials = true;
      xhr.timeout = 90_000;
      xhr.setRequestHeader("x-store-id", String(storeId));
      xhr.setRequestHeader("x-store-host", host);

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) {
          return;
        }

        const progress = Math.max(5, Math.min(100, Math.round((event.loaded / event.total) * 100)));
        setImageFiles((current) =>
          current.map((entry) =>
            entry.clientId === fileEntry.clientId
              ? { ...entry, progress }
              : entry,
          ),
        );
      };

      xhr.onerror = () => {
        reject(new Error(`Sin conexiÃ³n al subir ${fileEntry.name}. RevisÃ¡ tu red y reintentÃ¡.`));
      };

      xhr.ontimeout = () => {
        reject(new Error(`${fileEntry.name} tardÃ³ demasiado en subir. IntentÃ¡ de nuevo con mejor seÃ±al.`));
      };

      xhr.onload = () => {
        if (xhr.status === 413) {
          reject(new Error(`${fileEntry.name} superÃ³ el lÃ­mite del servidor. IntentÃ¡ con una imagen mÃ¡s pequeÃ±a.`));
          return;
        }

        if (xhr.status < 200 || xhr.status >= 300) {
          let errorMessage = `Error al subir ${fileEntry.name} (cÃ³digo ${xhr.status}).`;
          try {
            const parsed = JSON.parse(xhr.responseText) as { message?: string | string[] };
            const msg = Array.isArray(parsed.message)
              ? parsed.message.join(", ")
              : parsed.message;
            if (msg) errorMessage = msg;
          } catch {
            // Response is not JSON (e.g. nginx HTML error) â€” use the generic message
          }
          reject(new Error(errorMessage));
          return;
        }

        try {
          const parsed = JSON.parse(xhr.responseText) as {
            id: number;
            url: string;
            position?: number;
            offsetX?: number;
            offsetY?: number;
            zoom?: number;
          };

          resolve({
            id: parsed.id,
            url: parsed.url,
            position: Number(parsed.position ?? position),
            offsetX: Number(parsed.offsetX ?? fileEntry.offsetX),
            offsetY: Number(parsed.offsetY ?? fileEntry.offsetY),
            zoom: Number(parsed.zoom ?? fileEntry.zoom),
          });
        } catch {
          reject(new Error(`La respuesta de ${fileEntry.name} no fue valida.`));
        }
      };

      xhr.send(formData);
    });

  const processPendingImageUploads = useCallback(
    async (productId: number) => {
      if (imageQueueRunningRef.current) {
        return;
      }

      const pendingUploads = imageFiles
        .filter((entry) => entry.status === "pending" || entry.status === "error")
        .slice(0, 10);

      if (pendingUploads.length === 0) {
        setImageUploadProgress(null);
        return;
      }

      imageQueueRunningRef.current = true;
      let failedUploads = 0;
      let uploadedCount = 0;
      setImageUploadProgress({
        total: pendingUploads.length,
        uploaded: 0,
      });

      try {
        await runWithConcurrency(
          pendingUploads,
          IMAGE_UPLOAD_CONCURRENCY,
          async (fileEntry, index) => {
            const currentExistingCount = existingImages.length;

            setImageFiles((current) =>
              current.map((entry) =>
                entry.clientId === fileEntry.clientId
                  ? {
                      ...entry,
                      status: "uploading",
                      progress: Math.max(entry.progress, 5),
                      errorMessage: undefined,
                    }
                  : entry,
              ),
            );

            try {
              const uploadedImage = await uploadImageWithProgress(
                productId,
                fileEntry,
                currentExistingCount + index,
              );

              setExistingImages((current) => [...current, uploadedImage]);
              setOriginalImageIds((current) => [...current, uploadedImage.id]);
              setImageFiles((current) => {
                const target = current.find(
                  (entry) => entry.clientId === fileEntry.clientId,
                );
                if (target) {
                  URL.revokeObjectURL(target.previewUrl);
                }

                return current.filter(
                  (entry) => entry.clientId !== fileEntry.clientId,
                );
              });
              setImageUploadProgress((current) =>
                current
                  ? {
                      ...current,
                      uploaded: Math.min(current.total, current.uploaded + 1),
                    }
                  : current,
              );
              uploadedCount += 1;
            } catch (error) {
              failedUploads += 1;
              setImageFiles((current) =>
                current.map((entry) =>
                  entry.clientId === fileEntry.clientId
                    ? {
                        ...entry,
                        status: "error",
                        progress: 0,
                        errorMessage:
                          error instanceof Error
                            ? error.message
                            : `No se pudo subir ${entry.name}.`,
                      }
                    : entry,
                ),
              );
            }
          },
        );

        if (failedUploads > 0) {
          setError(
            `Se subieron ${uploadedCount} imagen(es) y ${failedUploads} quedaron pendientes para reintentar.`,
          );
        } else {
          setError("");
          setSuccess("Las imagenes del producto ya quedaron sincronizadas.");
        }
      } finally {
        imageQueueRunningRef.current = false;
        setImageUploadProgress(null);
      }
    },
    [existingImages.length, imageFiles],
  );

  useEffect(() => {
    if (!editingProductId || saving || imageQueueRunningRef.current) {
      return;
    }

    const hasQueuedUploads = imageFiles.some(
      (entry) => entry.status === "pending" || entry.status === "error",
    );

    if (!hasQueuedUploads) {
      return;
    }

    void processPendingImageUploads(editingProductId);
  }, [editingProductId, imageFiles, processPendingImageUploads, saving]);

  const retryPendingImageUploads = async () => {
    if (!editingProductId) {
      setError("Guarda el producto primero para subir las imagenes.");
      return;
    }

    setError("");
    await processPendingImageUploads(editingProductId);
  };

  const appendImageFiles = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    let preparedFiles: File[];

    try {
      preparedFiles = await Promise.all(
        files.map((file) => optimizeImageForUpload(file)),
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron preparar las imagenes para subir.",
      );
      return;
    }

    setImageFiles((current) => {
      const availableSlots = Math.max(
        0,
        10 - existingImages.length - current.length,
      );
      const nextFiles = preparedFiles
        .slice(0, availableSlots)
        .map((file, index) => ({
        clientId: createUploadImageId(),
        file,
        name: file.name,
        previewUrl: URL.createObjectURL(file),
        status: "pending" as const,
        progress: 0,
        ...defaultImageLayout(current.length + index),
      }));

      return [...current, ...nextFiles];
    });

    if (!editingProductId) {
      await ensureProductExistsForImageUploads();
    }
  };

  const removeUploadImage = (index: number) => {
    setImageFiles((current) => {
      const target = current[index];
      if (target?.status === "uploading") {
        return current;
      }
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const moveUploadImage = (fromIndex: number, direction: -1 | 1) => {
    setImageFiles((current) => {
      const toIndex = fromIndex + direction;

      if (
        toIndex < 0 ||
        toIndex >= current.length ||
        current[fromIndex]?.status === "uploading" ||
        current[toIndex]?.status === "uploading"
      ) {
        return current;
      }

      const next = [...current];
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      return normalizeImagePositions(next);
    });
  };

  const updateUploadImageLayout = (
    index: number,
    nextLayout: Partial<ImageLayoutState>,
  ) => {
    setImageFiles((current) =>
      current.map((image, itemIndex) =>
        itemIndex === index
          ? {
              ...image,
              ...nextLayout,
            }
          : image,
      ),
    );
  };

  const updateExistingImageLayout = (
    imageId: number,
    nextLayout: Partial<ImageLayoutState>,
  ) => {
    setExistingImages((current) =>
      current.map((image) =>
        image.id === imageId
          ? {
              ...image,
              ...nextLayout,
            }
          : image,
      ),
    );
  };

  const moveExistingImage = (imageId: number, direction: -1 | 1) => {
    setExistingImages((current) => {
      const fromIndex = current.findIndex((image) => image.id === imageId);
      const toIndex = fromIndex + direction;

      if (fromIndex < 0 || toIndex < 0 || toIndex >= current.length) {
        return current;
      }

      const next = [...current];
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      return normalizeImagePositions(next);
    });
  };

  const buildOptionValuesToPersist = () =>
    Object.entries(selectedOptionValues)
      .flatMap(([optionIdRaw, values]) =>
        values.map((value) => ({
          productOptionId: Number(optionIdRaw),
          value: value.trim(),
        })),
      )
      .filter((entry) => entry.value);

  const buildCompleteProductPayload = (variantsToSync: EditableVariant[]) => ({
    title: form.title.trim(),
    description: form.description.trim() || null,
    published: form.published,
    weightGrams: form.weightGrams.trim() ? Number(form.weightGrams) : null,
    packageHeightCm: form.packageHeightCm.trim()
      ? Number(form.packageHeightCm)
      : null,
    packageWidthCm: form.packageWidthCm.trim()
      ? Number(form.packageWidthCm)
      : null,
    packageLengthCm: form.packageLengthCm.trim()
      ? Number(form.packageLengthCm)
      : null,
    packagingTemplateId: packagingTemplateId || null,
    categoryIds: selectedCategoryIds,
    optionValues: buildOptionValuesToPersist(),
    variants: variantsToSync.map((variant) => ({
      ...(variant.id ? { id: variant.id } : {}),
      sku: variant.sku.trim(),
      price: parsePriceInput(variant.price),
      Size: variant.Size.trim() || null,
      Color: variant.Color.trim() || null,
      inventoryQuantity: variant.inventoryQuantity.trim()
        ? Number(variant.inventoryQuantity)
        : 0,
      weightGrams: variant.weight.trim() ? Number(variant.weight) : null,
      width: variant.width.trim() ? Number(variant.width) : null,
      length: variant.length.trim() ? Number(variant.length) : null,
      packageWidthCm: null,
      packageHeightCm: null,
      packageLengthCm: null,
    })),
  });

  const buildDraftProductPayload = useCallback(
    () => ({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      published: form.published,
      weightGrams: form.weightGrams.trim() ? Number(form.weightGrams) : undefined,
      packageHeightCm: form.packageHeightCm.trim()
        ? Number(form.packageHeightCm)
        : undefined,
      packageWidthCm: form.packageWidthCm.trim()
        ? Number(form.packageWidthCm)
        : undefined,
      packageLengthCm: form.packageLengthCm.trim()
        ? Number(form.packageLengthCm)
        : undefined,
      packagingTemplateId: packagingTemplateId || undefined,
    }),
    [form, packagingTemplateId],
  );

  const ensureProductExistsForImageUploads = useCallback(async () => {
    if (editingProductId) {
      return editingProductId;
    }

    if (imageDraftCreationRef.current) {
      return null;
    }

    if (!form.title.trim()) {
      setError("Escribe primero el nombre del producto para subir imagenes.");
      return null;
    }

    imageDraftCreationRef.current = true;

    try {
      const created = await api("/products", {
        method: "POST",
        body: JSON.stringify(buildDraftProductPayload()),
      });
      const nextProductId = Number(created?.id ?? 0);

      if (!nextProductId) {
        throw new Error("No se pudo preparar el producto para subir imagenes.");
      }

      setEditingProductId(nextProductId);
      setSuccess("Producto borrador creado. Las imagenes se suben en segundo plano.");
      return nextProductId;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo preparar el producto para subir imagenes.",
      );
      return null;
    } finally {
      imageDraftCreationRef.current = false;
    }
  }, [editingProductId, form, buildDraftProductPayload]);

  const saveProduct = async (autoGenerateSkus = false) => {
    if (saving) {
      return;
    }

    let productId = editingProductId;

    if (!form.title.trim()) {
      setError("El producto necesita un titulo.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      setDuplicateSkuPrompt(null);

      const wasEditing = editingProductId;
      const baseVariantsToSync = buildVariantsToPersist();

      if (
        baseVariantsToSync.some(
          (variant) => !variant.sku.trim() || parsePriceInput(variant.price) <= 0,
        )
      ) {
        showToast("Cada variante necesita SKU y precio.");
        setError("");
        setSaving(false);
        return;
      }

      const variantsToSync = autoGenerateSkus
        ? generateAutomaticSkus(baseVariantsToSync)
        : baseVariantsToSync;

      const savedProduct = editingProductId
        ? await api(`/products/${editingProductId}/save-complete`, {
            method: "PATCH",
            body: JSON.stringify(buildCompleteProductPayload(variantsToSync)),
          })
        : await api("/products/save-complete", {
            method: "POST",
            body: JSON.stringify(buildCompleteProductPayload(variantsToSync)),
          });

      productId = savedProduct?.id ?? productId;

      if (!productId) {
        throw new Error("Producto no encontrado");
      }

      if (!wasEditing && savedProduct?.id) {
        setEditingProductId(savedProduct.id);
      }

      let imageSyncError = "";
      const hasPendingImageUploads = imageFiles.length > 0;

      try {
        await syncExistingImages(productId);
      } catch (imageError) {
        imageSyncError =
          imageError instanceof Error
            ? imageError.message
            : "Las imagenes no se pudieron sincronizar.";
      }

      const nextProducts = await loadData();
      const refreshedProduct = nextProducts.find((item) => item.id === productId);

      if (wasEditing && refreshedProduct && !hasPendingImageUploads) {
        await hydrateFormFromProduct(refreshedProduct);
      } else if (!hasPendingImageUploads) {
        resetForm();
      }

      if (imageSyncError) {
        setError(imageSyncError);
        showToast(
          wasEditing
            ? "El producto se actualizo, pero algunas imagenes no se pudieron guardar."
            : "El producto se creo, pero algunas imagenes no se pudieron guardar.",
        );
        setSuccess("");
        return;
      }

      if (hasPendingImageUploads) {
        if (!wasEditing) {
          setEditingProductId(productId);
        }

        void processPendingImageUploads(productId);
        showToast(
          wasEditing
            ? "Producto actualizado. Las imagenes siguen subiendo en segundo plano."
            : "Producto creado. Las imagenes siguen subiendo en segundo plano.",
        );
        setSuccess("");
        setActiveTab("catalog");
        setWizardStep("info");
        formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      showToast(
        wasEditing
          ? "Producto actualizado."
          : "Producto creado.",
      );
      setSuccess("");
      resetForm();
      setActiveTab("catalog");
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo guardar el producto.";

      if (!autoGenerateSkus && isDuplicateSkuError(message)) {
        setDuplicateSkuPrompt({
          title: form.title.trim(),
        });
        setSaving(false);
        return;
      }

      if (!editingProductId && productId) {
        setEditingProductId(productId);
      }
      showToast(message);
      setError("");
    } finally {
      setSaving(false);
    }
  };

  const openLabelsForProduct = (productId: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("section", "admin-labels");
    params.set("productId", String(productId));
    window.location.href = `/account?${params.toString()}`;
  };

  const currentWizardIndex = productWizardSteps.findIndex((step) => step.id === wizardStep);
  const goWizard = (direction: 1 | -1) => {
    const nextIndex = Math.min(
      productWizardSteps.length - 1,
      Math.max(0, currentWizardIndex + direction),
    );
    setWizardStep(productWizardSteps[nextIndex]?.id ?? "info");
  };

  const renderProductWizard = () => (
    <div style={modernWorkspaceStyle}>
      {editingProductId ? (
        <div style={editingBannerStyle}>
          <div>
            <p style={eyebrowStyle}>Editando</p>
            <strong style={{ color: "var(--account-text-strong)" }}>
              {form.title || "Producto sin titulo"}
            </strong>
          </div>
          <button type="button" onClick={exitProductWizard} style={ghostButtonStyle}>
            Cancelar edicion
          </button>
        </div>
      ) : null}

      <div style={wizardStepperStyle}>
        {productWizardSteps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setWizardStep(step.id)}
            style={wizardStepButtonStyle(wizardStep === step.id)}
          >
            <span>{index + 1}</span>
            {step.label}
          </button>
        ))}
      </div>

      {wizardStep === "info" ? (
        <section style={wizardPanelStyle}>
          <div>
            <p style={eyebrowStyle}>Paso 1</p>
            <h3 style={title3Style}>Informacion</h3>
          </div>
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Nombre del producto"
            style={largeFieldStyle}
          />
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Descripcion"
            style={{ ...largeFieldStyle, minHeight: 180, resize: "vertical" }}
          />
        </section>
      ) : null}

      {wizardStep === "logistics" ? (
        <section style={wizardPanelStyle}>
          <div>
            <p style={eyebrowStyle}>Paso 2</p>
            <h3 style={title3Style}>Categorias y logistica</h3>
          </div>
          <div style={wizardTwoColumnStyle}>
            <div style={wizardSubpanelStyle}>
              <strong>Categorias</strong>
              <div style={chipRowStyle}>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    style={chipToggleStyle(selectedCategoryIds.includes(category.id))}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
              <div style={rowWrapStyle}>
                <input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="Nueva categoria"
                  style={smallFieldStyle}
                />
                <button
                  type="button"
                  onClick={() => void createCategoryInline()}
                  disabled={creatingCategoryInline || !newCategoryName.trim()}
                  style={secondaryButtonStyle}
                >
                  {creatingCategoryInline ? "Creando..." : "Crear"}
                </button>
              </div>
            </div>
            <div style={wizardSubpanelStyle}>
              <strong>Tipo de empaquetado</strong>
              <select
                value={packagingTemplateId}
                onChange={(event) => applyPackagingTemplate(event.target.value)}
                style={selectStyle}
              >
                <option value="">Seleccionar plantilla</option>
                {packagingTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <label style={checkStyle}>
                <input type="checkbox" defaultChecked />
                Utilizar siempre estas medidas para calcular envios
              </label>
              <div style={variantGridStyle}>
                <SuggestionInput value={form.weightGrams} onChange={(value) => setForm((current) => ({ ...current, weightGrams: value }))} placeholder="Peso envio (g)" suggestions={[]} sanitize={sanitizeDecimalInput} />
                <SuggestionInput value={form.packageWidthCm} onChange={(value) => setForm((current) => ({ ...current, packageWidthCm: value }))} placeholder="Ancho paquete (cm)" suggestions={[]} sanitize={sanitizeDecimalInput} />
                <SuggestionInput value={form.packageHeightCm} onChange={(value) => setForm((current) => ({ ...current, packageHeightCm: value }))} placeholder="Alto paquete (cm)" suggestions={[]} sanitize={sanitizeDecimalInput} />
                <SuggestionInput value={form.packageLengthCm} onChange={(value) => setForm((current) => ({ ...current, packageLengthCm: value }))} placeholder="Largo paquete (cm)" suggestions={[]} sanitize={sanitizeDecimalInput} />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {wizardStep === "images" ? (
        <section style={wizardPanelStyle}>
          <div>
            <p style={eyebrowStyle}>Paso 3</p>
            <h3 style={title3Style}>Imagenes</h3>
            <p style={copyStyle}>Hasta 10 imagenes. La primera es la portada. Usa los controles de orden de cada imagen y arrastra dentro del marco para encuadrar.</p>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              void appendImageFiles(Array.from(event.target.files ?? []));
              event.currentTarget.value = "";
            }}
            style={fieldStyle}
          />
          {existingImages.length > 0 ? (
            <div style={responsiveImageEditorGridStyle}>
              {existingImages.map((image, index) => (
                <CatalogImageLayoutEditor
                  key={image.id}
                  src={resolveAssetUrl(image.url) ?? image.url}
                  label={index === 0 ? "Portada" : `Imagen ${index + 1}`}
                  secondaryText=""
                  value={image}
                  gridLines={imageGridLines}
                  orderLabel={`Orden ${index + 1}`}
                  canMoveUp={index > 0}
                  canMoveDown={index < existingImages.length - 1}
                  onMoveUp={() => moveExistingImage(image.id, -1)}
                  onMoveDown={() => moveExistingImage(image.id, 1)}
                  onChange={(nextLayout) => updateExistingImageLayout(image.id, nextLayout)}
                  onRemove={() => setExistingImages((current) => current.filter((item) => item.id !== image.id))}
                />
              ))}
            </div>
          ) : null}
          {imageFiles.length > 0 ? (
            <div style={responsiveImageEditorGridStyle}>
              {imageFiles.map((entry, index) => (
                <CatalogImageLayoutEditor
                  key={entry.clientId}
                  src={entry.previewUrl}
                  label={existingImages.length + index === 0 ? "Portada" : entry.name}
                  secondaryText={entry.status === "uploading" ? `Subiendo ${entry.progress}%` : entry.status === "error" ? entry.errorMessage ?? "Fallo la subida" : "Pendiente"}
                  value={entry}
                  gridLines={imageGridLines}
                  orderLabel={`Orden ${existingImages.length + index + 1}`}
                  canMoveUp={index > 0 && entry.status !== "uploading"}
                  canMoveDown={index < imageFiles.length - 1 && entry.status !== "uploading"}
                  onMoveUp={() => moveUploadImage(index, -1)}
                  onMoveDown={() => moveUploadImage(index, 1)}
                  onChange={(nextLayout) => updateUploadImageLayout(index, nextLayout)}
                  onRemove={() => removeUploadImage(index)}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {wizardStep === "labels" ? (
        <section style={wizardPanelStyle}>
          <div>
            <p style={eyebrowStyle}>Paso 4</p>
            <h3 style={title3Style}>Atributos</h3>
          </div>
          <div style={rowWrapStyle}>
            <input value={newOptionName} onChange={(event) => setNewOptionName(event.target.value)} placeholder="Nuevo atributo" style={smallFieldStyle} />
            <button type="button" onClick={createOption} disabled={creatingOption || !newOptionName.trim()} style={secondaryButtonStyle}>
              {creatingOption ? "Creando..." : "Crear atributo"}
            </button>
          </div>
          <div style={responsiveOptionGridStyle}>
            {options.map((option) => (
              <article key={option.id} style={optionCardStyle}>
                <strong>{option.name}</strong>
                <div style={chipRowStyle}>
                  {(option.reusableValues ?? []).map((value) => (
                    <button
                      key={`${option.id}-${value.id}`}
                      type="button"
                      onClick={() => toggleOptionValue(option.id, value.value)}
                      style={chipToggleStyle((selectedOptionValues[option.id] ?? []).includes(value.value))}
                    >
                      {value.value}
                    </button>
                  ))}
                </div>
                <div style={rowWrapStyle}>
                  <input value={draftOptionValues[option.id] ?? ""} onChange={(event) => setDraftOptionValues((current) => ({ ...current, [option.id]: event.target.value }))} placeholder="Nuevo valor" style={smallFieldStyle} />
                  <button type="button" onClick={() => addOptionValue(option.id)} style={secondaryButtonStyle}>Agregar</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {wizardStep === "variants" ? (
        <section style={wizardPanelStyle}>
          <div>
            <p style={eyebrowStyle}>Paso 5</p>
            <h3 style={title3Style}>Variantes y stock</h3>
          </div>
          <div style={wizardSubpanelStyle}>
            <strong>Generador rapido</strong>
            <span style={metaStyle}>
              Elegí los atributos de este producto y sus valores para generar combinaciones automaticamente.
            </span>
            <div style={attributePickerGridStyle}>
              {options.map((option) => (
                <div key={option.id} style={attributePickerStyle}>
                  <label style={checkStyle}>
                    <input
                      type="checkbox"
                      checked={selectedVariantAttributeIds.includes(option.id)}
                      onChange={() => toggleVariantAttribute(option.id)}
                    />
                    {option.name}
                  </label>
                  {selectedVariantAttributeIds.includes(option.id) ? (
                    <div style={chipRowStyle}>
                      {(option.reusableValues ?? []).map((value) => (
                        <button
                          key={value.id}
                          type="button"
                          onClick={() => toggleOptionValue(option.id, value.value)}
                          style={chipToggleStyle((selectedOptionValues[option.id] ?? []).includes(value.value))}
                        >
                          {value.visualColor ? <span style={colorSwatchStyle(value.visualColor)} /> : null}
                          {value.value}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div style={responsiveVariantGridStyle}>
              <SuggestionInput value={variantDraft.price} onChange={(value) => setVariantDraft((current) => ({ ...current, price: value }))} placeholder="Precio base" suggestions={variantAutocomplete.price} />
              <SuggestionInput value={variantDraft.inventoryQuantity} onChange={(value) => setVariantDraft((current) => ({ ...current, inventoryQuantity: value }))} placeholder="Stock base" suggestions={variantAutocomplete.inventoryQuantity} />
              <SuggestionInput value={variantDraft.Color} onChange={(value) => setVariantDraft((current) => ({ ...current, Color: value }))} placeholder="Color/es (Negro, Blanco)" suggestions={variantAutocomplete.color} />
              <SuggestionInput value={variantDraft.Size} onChange={(value) => setVariantDraft((current) => ({ ...current, Size: value }))} placeholder="Talle/s (S, M, L)" suggestions={variantAutocomplete.size} />
              <SuggestionInput value={variantDraft.width} onChange={(value) => setVariantDraft((current) => ({ ...current, width: value }))} placeholder="Ancho prenda base (cm)" suggestions={variantAutocomplete.width} sanitize={sanitizeDecimalInput} />
              <SuggestionInput value={variantDraft.length} onChange={(value) => setVariantDraft((current) => ({ ...current, length: value }))} placeholder="Largo prenda base (cm)" suggestions={variantAutocomplete.length} sanitize={sanitizeDecimalInput} />
            </div>
            <button type="button" onClick={generateVariantsFromMatrix} style={primaryButtonStyle}>Generar variantes</button>
          </div>
          {selectedVariantIndexes.length > 0 ? (
            <div style={wizardSubpanelStyle}>
              <strong>Edicion masiva ({selectedVariantIndexes.length})</strong>
              <div style={variantGridStyle}>
                <input value={bulkVariantPatch.price} onChange={(event) => setBulkVariantPatch((current) => ({ ...current, price: event.target.value }))} placeholder="Cambiar precio" style={fieldStyle} />
                <input value={bulkVariantPatch.stock} onChange={(event) => setBulkVariantPatch((current) => ({ ...current, stock: event.target.value }))} placeholder="Cambiar stock" style={fieldStyle} />
                <input value={bulkVariantPatch.color} onChange={(event) => setBulkVariantPatch((current) => ({ ...current, color: event.target.value }))} placeholder="Cambiar color" style={fieldStyle} />
                <input value={bulkVariantPatch.size} onChange={(event) => setBulkVariantPatch((current) => ({ ...current, size: event.target.value }))} placeholder="Cambiar talle" style={fieldStyle} />
              </div>
              <button type="button" onClick={applyBulkVariantPatch} style={secondaryButtonStyle}>Aplicar cambios</button>
            </div>
          ) : null}
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}></th>
                  <th style={thStyle}>SKU</th>
                  <th style={thStyle}>Color</th>
                  <th style={thStyle}>Talle</th>
                  <th style={thStyle}>Precio</th>
                  <th style={thStyle}>Stock</th>
                  <th style={thStyle}>Ancho prenda</th>
                  <th style={thStyle}>Largo prenda</th>
                  <th style={thStyle}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant, index) => (
                  <tr key={`${variant.sku}-${index}`}>
                    <td style={tdStyle}><input type="checkbox" checked={selectedVariantIndexes.includes(index)} onChange={() => toggleVariantSelection(index)} /></td>
                    <td style={tdStyle}>{variant.sku}</td>
                    <td style={tdStyle}>{variant.Color}</td>
                    <td style={tdStyle}>{variant.Size}</td>
                    <td style={tdStyle}>{money(variant.price)}</td>
                    <td style={tdStyle}>
                      <input
                        value={variant.inventoryQuantity}
                        onChange={(event) => updateVariantAt(index, { inventoryQuantity: sanitizeIntegerInput(event.target.value) })}
                        placeholder="0"
                        style={compactCellInputStyle}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        value={variant.width}
                        onChange={(event) => updateVariantAt(index, { width: sanitizeDecimalInput(event.target.value) })}
                        placeholder="cm"
                        style={compactCellInputStyle}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        value={variant.length}
                        onChange={(event) => updateVariantAt(index, { length: sanitizeDecimalInput(event.target.value) })}
                        placeholder="cm"
                        style={compactCellInputStyle}
                      />
                    </td>
                    <td style={tdStyle}>
                      <div style={iconActionsStyle}>
                        <button type="button" title="Duplicar variante" aria-label="Duplicar variante" onClick={() => duplicateVariantSmart(index)} style={iconButtonStyle}>&#10697;</button>
                        <button type="button" title="Eliminar variante" aria-label="Eliminar variante" onClick={() => setPendingRemoval({ kind: "variant", variantIndex: index, variantLabel: variant.sku || `Variante ${index + 1}`, productsCount: 0 })} style={iconButtonStyle}>&times;</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {wizardStep === "publish" ? (
        <section style={wizardPanelStyle}>
          <div>
            <p style={eyebrowStyle}>Paso 6</p>
            <h3 style={title3Style}>Publicacion</h3>
          </div>
          <div style={publicationGridStyle}>
            <button type="button" onClick={() => setForm((current) => ({ ...current, published: true }))} style={publicationChoiceStyle(form.published)}>Publicar ahora</button>
            <button type="button" onClick={() => setForm((current) => ({ ...current, published: false }))} style={publicationChoiceStyle(!form.published)}>Guardar como borrador</button>
            <button type="button" onClick={() => setForm((current) => ({ ...current, published: false }))} style={publicationChoiceStyle(false)}>Solo inventario local</button>
          </div>
        </section>
      ) : null}

      <div style={footerStyle}>
        <div>
          {error ? <p style={errorStyle}>{error}</p> : null}
        </div>
        <div style={rowWrapStyle}>
          <button type="button" style={ghostButtonStyle} onClick={exitProductWizard}>
            Volver al catalogo
          </button>
          <button type="button" style={ghostButtonStyle} disabled={currentWizardIndex <= 0} onClick={() => goWizard(-1)}>Atras</button>
          {currentWizardIndex < productWizardSteps.length - 1 ? (
            <button type="button" style={primaryButtonStyle} onClick={() => goWizard(1)}>Siguiente</button>
          ) : (
            <button type="button" onClick={() => void saveProduct()} disabled={saving || !form.title.trim()} style={primaryButtonStyle}>
              {saving ? "Guardando..." : editingProductId ? "Guardar cambios" : "Guardar producto"}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderModernCatalog = () => (
    <div style={modernWorkspaceStyle}>
      <div style={catalogToolbarStyle}>
        <input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Buscar productos" style={responsiveSearchFieldStyle} />
        <select value={productCategoryFilter} onChange={(event) => setProductCategoryFilter(event.target.value)} style={responsiveSelectStyle}>
          <option value="all">Todas las categorias</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <select value={productStatusFilter} onChange={(event) => setProductStatusFilter(event.target.value as typeof productStatusFilter)} style={responsiveSelectStyle}>
          <option value="all">Todos los estados</option>
          <option value="published">Publicado</option>
          <option value="draft">Borrador</option>
          <option value="without-stock">Sin stock</option>
        </select>
        <button type="button" onClick={startNewProduct} style={primaryButtonStyle}>+ Crear nuevo producto</button>
      </div>
      <div style={statsGridStyle}>
        <Stat label="Productos totales" value={String(productMetrics.total)} />
        <Stat label="Publicados" value={String(productMetrics.published)} />
        <Stat label="Borradores" value={String(productMetrics.draft)} />
        <Stat label="Sin stock" value={String(productMetrics.withoutStock)} />
      </div>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Imagen</th>
              <th style={thStyle}>Producto</th>
              <th style={thStyle}>Categoria</th>
              <th style={thStyle}>Variantes</th>
              <th style={thStyle}>Stock total</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle}>Precio desde</th>
              <th style={thStyle}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={tdStyle}>Cargando catalogo...</td></tr>
            ) : filteredProducts.map((product) => (
              <tr key={product.id}>
                <td style={tdStyle}>
                  {product.images?.[0]?.url ? (
                    <Image
                      src={resolveAssetUrl(product.images[0].url) ?? product.images[0].url}
                      alt={product.title}
                      width={48}
                      height={48}
                      unoptimized
                      style={productThumbStyle}
                    />
                  ) : <span style={productThumbEmptyStyle} />}
                </td>
                <td style={tdStyle}>
                  <strong style={{ color: "var(--account-text-strong)" }}>{product.title}</strong>
                  <span style={metaStyle}>/{product.slug}</span>
                </td>
                <td style={tdStyle}>{getProductCategoryNames(product).join(", ") || "Sin categoria"}</td>
                <td style={tdStyle}>{product.variants?.length ?? 0}</td>
                <td style={tdStyle}>{getProductTotalStock(product)}</td>
                <td style={tdStyle}><span style={productCatalogStatusStyle(getProductCatalogStatus(product))}>{getProductCatalogStatus(product)}</span></td>
                <td style={tdStyle}>{getProductPriceFrom(product) ? money(getProductPriceFrom(product)) : "-"}</td>
                <td style={tdStyle}>
                  <div style={iconActionsStyle}>
                    <button type="button" title="Editar" aria-label="Editar producto" onClick={() => void hydrateFormFromProduct(product)} style={iconButtonStyle}>&#9998;</button>
                    <button type="button" title="Duplicar" aria-label="Duplicar producto" onClick={() => void duplicateProductDraft(product)} style={iconButtonStyle}>&#10697;</button>
                    <button type="button" title="Eliminar" aria-label="Eliminar producto" onClick={() => setPendingRemoval({ kind: "product", productId: product.id, productTitle: product.title, productsCount: 0 })} style={iconButtonStyle}>&times;</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <section style={panelStyle}>
      <style>
        {`
          @keyframes productToastIn {
            from {
              opacity: 0;
              transform: translateY(18px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .attribute-table-row {
            transition:
              background 160ms ease,
              box-shadow 160ms ease,
              color 160ms ease;
          }

          .attribute-table-row:hover {
            background: rgba(116, 184, 168, 0.22);
            box-shadow: inset 4px 0 0 var(--brand-accent);
          }

          .attribute-table-row:hover td {
            color: var(--account-text-strong);
          }
        `}
      </style>
      <div ref={formTopRef} />
      <section style={stackedSectionStyle}>
        {activeTab !== "create" ? (
          <div style={{ display: "grid", gap: 14, minWidth: 0, width: "100%" }}>
            <h2 style={catalogTitleStyle}>Gestión del catálogo</h2>
            <div style={responsiveTabRailStyle}>
              <button
                type="button"
                onClick={() => setActiveTab("catalog")}
                style={workspaceTabStyle(activeTab === "catalog")}
              >
                Productos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("options")}
                style={workspaceTabStyle(activeTab === "options")}
              >
                Atributos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("categories")}
                style={workspaceTabStyle(activeTab === "categories")}
              >
                Categorias
              </button>
            </div>
          </div>
        ) : null}
        <section
          style={{
            ...responsiveShellStyle,
            display: activeTab === "create" ? "grid" : "none",
          }}
        >
          {renderProductWizard()}
          <div style={{ display: "none" }}>
          {editingProductId ? (
            <div style={editingBannerStyle}>
              <div>
                <p style={eyebrowStyle}>Editando</p>
                <strong style={{ color: "var(--account-text-strong)" }}>
                  {form.title || "Producto sin titulo"}
                </strong>
              </div>
              <button
                type="button"
                onClick={resetForm}
                style={ghostButtonStyle}
              >
                Cancelar edicion
              </button>
            </div>
          ) : null}

          <div style={responsiveTopGridStyle}>
            <Step title="Datos base">
              <label style={checkStyle}>
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      published: event.target.checked,
                    }))
                  }
                />
                Publicado
              </label>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Nombre del producto"
                style={fieldStyle}
              />
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Breve descripcion"
                style={{ ...fieldStyle, minHeight: 120, resize: "vertical" }}
              />
            </Step>

            <Step title="Logistica base">
              <span style={metaStyle}>
                Estos valores funcionan como fallback del producto cuando una variante no tiene datos logisticos propios.
              </span>
              <div style={responsiveVariantGridStyle}>
                <SuggestionInput
                  value={form.weightGrams}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, weightGrams: value }))
                  }
                  placeholder="Peso base (g)"
                  suggestions={[]}
                  sanitize={sanitizeDecimalInput}
                />
                <SuggestionInput
                  value={form.packageWidthCm}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      packageWidthCm: value,
                    }))
                  }
                  placeholder="Ancho base (cm)"
                  suggestions={[]}
                  sanitize={sanitizeDecimalInput}
                />
                <SuggestionInput
                  value={form.packageHeightCm}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      packageHeightCm: value,
                    }))
                  }
                  placeholder="Alto base (cm)"
                  suggestions={[]}
                  sanitize={sanitizeDecimalInput}
                />
                <SuggestionInput
                  value={form.packageLengthCm}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      packageLengthCm: value,
                    }))
                  }
                  placeholder="Largo base (cm)"
                  suggestions={[]}
                  sanitize={sanitizeDecimalInput}
                />
              </div>
            </Step>

            <Step title="Categorias">
              <span style={metaStyle}>
                Selecciona las categorias para este producto.
              </span>
              <div style={chipRowStyle}>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    style={chipToggleStyle(
                      selectedCategoryIds.includes(category.id),
                    )}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </Step>
          </div>

          <Step title="Imagenes">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                void appendImageFiles(Array.from(event.target.files ?? []));
                event.currentTarget.value = "";
              }}
              style={fieldStyle}
            />
            <span style={metaStyle}>
              Hasta 10 imagenes. Arrastra cada foto dentro del cuadro para
              definir exactamente como se vera en el catalogo.
            </span>
            {imageFiles.length > 0 ? (
              <div style={{ ...rowWrapStyle, alignItems: "center" }}>
                <span style={metaStyle}>
                  {imageUploadProgress
                    ? `Subiendo ${imageUploadProgress.uploaded}/${imageUploadProgress.total} imagenes`
                    : failedImageCount > 0
                      ? `${failedImageCount} imagen(es) listas para reintentar`
                      : `${pendingImageCount} imagen(es) pendientes de subida`}
                </span>
                {editingProductId && pendingImageCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => void retryPendingImageUploads()}
                    disabled={Boolean(imageUploadProgress)}
                    style={secondaryButtonStyle}
                  >
                    {imageUploadProgress ? "Subiendo..." : "Subir pendientes"}
                  </button>
                ) : null}
              </div>
            ) : null}
            <div style={{ ...rowWrapStyle, alignItems: "center" }}>
              <span style={metaStyle}>Cuadricula: {imageGridLines}</span>
              <button
                type="button"
                onClick={() =>
                  setImageGridLines((current) => Math.max(0, current - 1))
                }
                style={secondaryButtonStyle}
              >
                -
              </button>
              <button
                type="button"
                onClick={() =>
                  setImageGridLines((current) => Math.min(20, current + 1))
                }
                style={secondaryButtonStyle}
              >
                +
              </button>
            </div>

            {existingImages.length > 0 ? (
              <div style={responsiveImageEditorGridStyle}>
                {existingImages.map((image, index) => (
                  <CatalogImageLayoutEditor
                    key={image.id}
                    src={resolveAssetUrl(image.url) ?? image.url}
                    label={`Imagen actual #${index + 1}`}
                    secondaryText={image.url}
                    value={image}
                    gridLines={imageGridLines}
                    orderLabel={`Orden ${index + 1} de ${
                      existingImages.length + imageFiles.length
                    }`}
                    canMoveUp={index > 0}
                    canMoveDown={index < existingImages.length - 1}
                    onMoveUp={() => moveExistingImage(image.id, -1)}
                    onMoveDown={() => moveExistingImage(image.id, 1)}
                    onChange={(nextLayout) =>
                      updateExistingImageLayout(image.id, nextLayout)
                    }
                    onRemove={() =>
                      setExistingImages((current) =>
                        current.filter((item) => item.id !== image.id),
                      )
                    }
                  />
                ))}
              </div>
            ) : null}

            {imageFiles.length > 0 ? (
              <div style={responsiveImageEditorGridStyle}>
                {imageFiles.map((entry, index) => (
                  <CatalogImageLayoutEditor
                    key={entry.clientId}
                    src={entry.previewUrl}
                    label={entry.name}
                    secondaryText={`${(entry.file.size / 1024 / 1024).toFixed(2)} MB Â· ${
                      entry.status === "uploading"
                        ? `Subiendo ${entry.progress}%`
                        : entry.status === "error"
                          ? entry.errorMessage ?? "Fallo la subida"
                          : "Pendiente"
                    }`}
                    value={entry}
                    gridLines={imageGridLines}
                    orderLabel={`Orden ${existingImages.length + index + 1} de ${
                      existingImages.length + imageFiles.length
                    }`}
                    canMoveUp={index > 0 && entry.status !== "uploading"}
                    canMoveDown={
                      index < imageFiles.length - 1 && entry.status !== "uploading"
                    }
                    onMoveUp={() => moveUploadImage(index, -1)}
                    onMoveDown={() => moveUploadImage(index, 1)}
                    onChange={(nextLayout) =>
                      updateUploadImageLayout(index, nextLayout)
                    }
                    onRemove={() => removeUploadImage(index)}
                  />
                ))}
              </div>
            ) : null}
          </Step>

          <Step title="Atributos reutilizables">
            <div style={rowWrapStyle}>
              <input
                value={newOptionName}
                onChange={(event) => setNewOptionName(event.target.value)}
                placeholder="Crear nuevo atributo"
                style={smallFieldStyle}
              />
              <button
                type="button"
                onClick={createOption}
                disabled={creatingOption || !newOptionName.trim()}
                style={secondaryButtonStyle}
              >
                {creatingOption ? "Creando..." : "Crear"}
              </button>
            </div>
            <div style={responsiveOptionGridStyle}>
              {options.map((option) => (
                <article key={option.id} style={optionCardStyle}>
                  <strong style={{ color: "var(--account-text-strong)" }}>
                    {option.name}
                  </strong>
                  <div style={optionValuesAreaStyle}>
                    <div style={chipRowStyle}>
                      {(option.reusableValues ?? []).map((value) => (
                        <button
                          key={`${option.id}-${value.id}`}
                          type="button"
                          onClick={() =>
                            toggleOptionValue(option.id, value.value)
                          }
                          style={chipToggleStyle(
                            (selectedOptionValues[option.id] ?? []).includes(
                              value.value,
                            ),
                          )}
                        >
                          {value.value}
                        </button>
                      ))}
                    </div>
                    {editingProductId &&
                    (selectedOptionValues[option.id] ?? []).length > 0 ? (
                      <div style={selectedValuesBlockStyle}>
                        <span style={metaStyle}>Asignados a este producto</span>
                        <div style={chipRowStyle}>
                          {(selectedOptionValues[option.id] ?? []).map(
                            (value) => (
                              <button
                                key={`${option.id}-selected-${value}`}
                                type="button"
                                onClick={() =>
                                  void removeOptionValueFromProduct(
                                    option.id,
                                    value,
                                  )
                                }
                                style={removeChipStyle}
                              >
                                Quitar {value}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div style={optionActionsStyle}>
                    <input
                      value={draftOptionValues[option.id] ?? ""}
                      onChange={(event) =>
                        setDraftOptionValues((current) => ({
                          ...current,
                          [option.id]: event.target.value,
                        }))
                      }
                      placeholder={`Nuevo valor para ${option.name}`}
                      style={smallFieldStyle}
                    />
                    <button
                      type="button"
                      onClick={() => addOptionValue(option.id)}
                      style={fullWidthSecondaryButtonStyle}
                    >
                      Agregar valor
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </Step>

          <Step title="Variantes e inventario">
            <div style={responsiveVariantGridStyle}>
              <SuggestionInput
                value={variantDraft.sku}
                onChange={(value) =>
                  setVariantDraft((current) => ({ ...current, sku: value }))
                }
                placeholder="SKU"
                suggestions={variantAutocomplete.sku}
              />
              <SuggestionInput
                value={variantDraft.price}
                onChange={(value) =>
                  setVariantDraft((current) => ({ ...current, price: value }))
                }
                placeholder="Precio"
                suggestions={variantAutocomplete.price}
              />
              <SuggestionInput
                value={variantDraft.Size}
                onChange={(value) =>
                  setVariantDraft((current) => ({ ...current, Size: value }))
                }
                placeholder="Talle"
                suggestions={variantAutocomplete.size}
              />
              <SuggestionInput
                value={variantDraft.Color}
                onChange={(value) =>
                  setVariantDraft((current) => ({ ...current, Color: value }))
                }
                placeholder="Color"
                suggestions={variantAutocomplete.color}
              />
              <SuggestionInput
                value={variantDraft.inventoryQuantity}
                onChange={(value) =>
                  setVariantDraft((current) => ({
                    ...current,
                    inventoryQuantity: value,
                  }))
                }
                placeholder="Stock"
                suggestions={variantAutocomplete.inventoryQuantity}
              />
              <SuggestionInput
                value={variantDraft.weight}
                onChange={(value) =>
                  setVariantDraft((current) => ({ ...current, weight: value }))
                }
                placeholder="Peso (g)"
                suggestions={variantAutocomplete.weight}
                sanitize={sanitizeDecimalInput}
              />
              <SuggestionInput
                value={variantDraft.width}
                onChange={(value) =>
                  setVariantDraft((current) => ({ ...current, width: value }))
                }
                placeholder="Ancho (cm)"
                suggestions={variantAutocomplete.width}
                sanitize={sanitizeDecimalInput}
              />
              <SuggestionInput
                value={variantDraft.height}
                onChange={(value) =>
                  setVariantDraft((current) => ({ ...current, height: value }))
                }
                placeholder="Alto (cm)"
                suggestions={variantAutocomplete.height}
                sanitize={sanitizeDecimalInput}
              />
              <SuggestionInput
                value={variantDraft.length}
                onChange={(value) =>
                  setVariantDraft((current) => ({ ...current, length: value }))
                }
                placeholder="Largo (cm)"
                suggestions={variantAutocomplete.length}
                sanitize={sanitizeDecimalInput}
              />
            </div>
            <div style={rowWrapStyle}>
              <button
                type="button"
                onClick={addVariant}
                style={secondaryButtonStyle}
              >
                {variantDraft.id ? "Actualizar variante" : "Agregar variante"}
              </button>
              {variantDraftIsDirty ? (
                <button
                  type="button"
                  onClick={clearVariantDraft}
                  style={ghostButtonStyle}
                >
                  {editingVariantIndex !== null ? "Cancelar edicion" : "Limpiar variante"}
                </button>
              ) : null}
            </div>
            {variants.length > 0 ? (
              isPhone ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {variants.map((variant, index) => (
                    <article
                      key={`${variant.id ?? "new"}-${variant.sku}-${index}`}
                      style={{ ...itemStyle, padding: 16 }}
                    >
                      <div style={betweenStyle}>
                        <strong style={{ color: "var(--account-text-strong)" }}>
                          {variant.sku || `Variante ${index + 1}`}
                        </strong>
                        <span style={softChipStyle}>
                          Stock {variant.inventoryQuantity || "0"}
                        </span>
                      </div>
                      <div style={{ display: "grid", gap: 6 }}>
                        <span style={metaStyle}>
                          {[variant.Size, variant.Color].filter(Boolean).join(" / ") || "Base"}
                        </span>
                        <strong style={{ color: "var(--account-text-strong)" }}>{money(variant.price)}</strong>
                      </div>
                      <div style={rowWrapStyle}>
                        <button
                          type="button"
                          onClick={() => requestEditVariant(index)}
                          style={ghostButtonStyle}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPendingRemoval({
                              kind: "variant",
                              variantIndex: index,
                              variantLabel:
                                [variant.sku, variant.Size, variant.Color]
                                  .filter(Boolean)
                                  .join(" - ") || `Variante ${index + 1}`,
                              productsCount: 0,
                            })
                          }
                          style={ghostButtonStyle}
                        >
                          Quitar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div style={tableWrapStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>SKU</th>
                        <th style={thStyle}>Atributos</th>
                        <th style={thStyle}>Precio</th>
                        <th style={thStyle}>Stock</th>
                        <th style={thStyle}>Accion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((variant, index) => (
                        <tr
                          key={`${variant.id ?? "new"}-${variant.sku}-${index}`}
                        >
                          <td style={tdStyle}>{variant.sku}</td>
                          <td style={tdStyle}>
                            {[variant.Size, variant.Color]
                              .filter(Boolean)
                              .join(" / ") || "Base"}
                          </td>
                          <td style={tdStyle}>{money(variant.price)}</td>
                          <td style={tdStyle}>
                            {variant.inventoryQuantity || "0"}
                          </td>
                          <td style={tdStyle}>
                            <div style={rowWrapStyle}>
                              <button
                                type="button"
                                onClick={() => requestEditVariant(index)}
                                style={ghostButtonStyle}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingRemoval({
                                    kind: "variant",
                                    variantIndex: index,
                                    variantLabel:
                                      [variant.sku, variant.Size, variant.Color]
                                        .filter(Boolean)
                                        .join(" - ") || `Variante ${index + 1}`,
                                    productsCount: 0,
                                  })
                                }
                                style={ghostButtonStyle}
                              >
                                Quitar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : null}
          </Step>

          <div style={footerStyle}>
            <div>
              {error ? <p style={errorStyle}>{error}</p> : null}
              {success ? <p style={successStyle}>{success}</p> : null}
            </div>
            <div style={rowWrapStyle}>
              {editingProductId ? (
                <button
                  type="button"
                  onClick={() => openLabelsForProduct(editingProductId)}
                  style={ghostButtonStyle}
                >
                  Imprimir etiquetas
                </button>
              ) : null}
              <button
                type="button"
                onClick={resetForm}
                style={ghostButtonStyle}
              >
                {editingProductId ? "Cancelar" : "Limpiar"}
              </button>
              <button
                type="button"
                onClick={() => void saveProduct()}
                disabled={saving || !form.title.trim()}
                style={primaryButtonStyle}
              >
                {saving
                  ? imageUploadProgress
                    ? `Subiendo imagenes ${imageUploadProgress.uploaded}/${imageUploadProgress.total}...`
                    : "Guardando..."
                  : editingProductId
                    ? "Guardar cambios"
                    : "Crear producto completo"}
              </button>
            </div>
          </div>
          </div>
        </section>

        <section
          style={{
            ...stackedSectionStyle,
            display: activeTab === "catalog" ? "grid" : "none",
          }}
        >
          {renderModernCatalog()}
          <div style={{ display: "none" }}>
          <div style={betweenStyle}>
            <div>
              <p style={eyebrowStyle}>Catalogo actual</p>
              <h3 style={{ ...title3Style, marginTop: 8 }}>Vista resumida</h3>
            </div>
            <div style={rowWrapStyle}>
              <input
                value={productQuery}
                onChange={(event) => setProductQuery(event.target.value)}
                placeholder="Filtrar por producto, slug o categoria"
                style={responsiveSearchFieldStyle}
              />
              <button
                type="button"
                onClick={() => void loadData()}
                style={secondaryButtonStyle}
              >
                Recargar
              </button>
            </div>
          </div>
          {loading ? (
            <StateCard label="Cargando catalogo..." />
          ) : (
            isTabletOrSmaller ? (
              <div style={{ display: "grid", gap: 12 }}>
                {filteredProducts.map((product) => (
                  <article key={product.id} style={{ ...itemStyle, padding: isPhone ? 16 : 18 }}>
                    <div style={betweenStyle}>
                      <div>
                        <strong
                          style={{
                            display: "block",
                            color: "var(--account-text-strong)",
                          }}
                        >
                          {product.title}
                        </strong>
                        <span style={metaStyle}>/{product.slug}</span>
                      </div>
                      <span style={statusStyle(product.published)}>
                        {product.published ? "Publicado" : "Borrador"}
                      </span>
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <span style={metaStyle}>
                        {(product.categories ?? [])
                          .map((entry) => entry.category.name)
                          .join(", ") || "Sin categorias"}
                      </span>
                      <span style={copyStyle}>
                        {product.images?.length ?? 0} imagenes Â· {product.variants?.length ?? 0} variantes
                      </span>
                    </div>
                    <div style={rowWrapStyle}>
                      <button
                        type="button"
                        onClick={() => void hydrateFormFromProduct(product)}
                        style={ghostButtonStyle}
                        disabled={loadingEditId === product.id}
                      >
                        {loadingEditId === product.id ? "Cargando..." : "Editar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openLabelsForProduct(product.id)}
                        style={ghostButtonStyle}
                      >
                        Etiquetas
                      </button>
                      <button
                        type="button"
                        onClick={() => void duplicateProductDraft(product)}
                        style={ghostButtonStyle}
                        disabled={loadingEditId === product.id}
                      >
                        Duplicar
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingRemoval({
                            kind: "product",
                            productId: product.id,
                            productTitle: product.title,
                            productsCount: 0,
                          })
                        }
                        style={ghostButtonStyle}
                        disabled={savingOptionKey === `product-${product.id}`}
                      >
                        {savingOptionKey === `product-${product.id}` ? "Eliminando..." : "Eliminar"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div style={tableWrapStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Producto</th>
                      <th style={thStyle}>Estado</th>
                      <th style={thStyle}>Categorias</th>
                      <th style={thStyle}>Imagenes</th>
                      <th style={thStyle}>Variantes</th>
                      <th style={thStyle}>Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id}>
                        <td style={tdStyle}>
                          <strong
                            style={{
                              display: "block",
                              color: "var(--account-text-strong)",
                            }}
                          >
                            {product.title}
                          </strong>
                          <span style={metaStyle}>/{product.slug}</span>
                        </td>
                        <td style={tdStyle}>
                          <span style={statusStyle(product.published)}>
                            {product.published ? "Publicado" : "Borrador"}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          {(product.categories ?? [])
                            .map((entry) => entry.category.name)
                            .join(", ") || "Sin categorias"}
                        </td>
                        <td style={tdStyle}>{product.images?.length ?? 0}</td>
                        <td style={tdStyle}>{product.variants?.length ?? 0}</td>
                        <td style={tdStyle}>
                          <div style={rowWrapStyle}>
                            <button
                              type="button"
                              onClick={() => void hydrateFormFromProduct(product)}
                              style={ghostButtonStyle}
                              disabled={loadingEditId === product.id}
                            >
                              {loadingEditId === product.id
                                ? "Cargando..."
                                : "Editar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openLabelsForProduct(product.id)}
                              style={ghostButtonStyle}
                            >
                              Etiquetas
                            </button>
                            <button
                              type="button"
                              onClick={() => void duplicateProductDraft(product)}
                              style={ghostButtonStyle}
                              disabled={loadingEditId === product.id}
                            >
                              Duplicar
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingRemoval({
                                  kind: "product",
                                  productId: product.id,
                                  productTitle: product.title,
                                  productsCount: 0,
                                })
                              }
                              style={ghostButtonStyle}
                              disabled={
                                savingOptionKey === `product-${product.id}`
                              }
                            >
                              {savingOptionKey === `product-${product.id}`
                                ? "Eliminando..."
                                : "Eliminar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
          </div>
        </section>
        <section
          style={{
            ...stackedSectionStyle,
            display: activeTab === "options" ? "grid" : "none",
          }}
        >
          <div style={catalogToolbarStyle}>
            <input
              value={optionQuery}
              onChange={(event) => setOptionQuery(event.target.value)}
              placeholder="Buscar atributos"
              style={responsiveSearchFieldStyle}
            />
            <button
              type="button"
              onClick={() => openAttributeModal()}
              style={primaryButtonStyle}
            >
              + Nuevo atributo
            </button>
          </div>

          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Nombre</th>
                  <th style={thStyle}>Valores</th>
                  <th style={thStyle}>Productos</th>
                </tr>
              </thead>
              <tbody>
                {filteredOptions.map((option) => (
                  <tr
                    key={option.id}
                    className="attribute-table-row"
                    onClick={() => openAttributeModal(option)}
                    style={selectableRowStyle}
                  >
                    <td style={tdStyle}><strong>{option.name}</strong></td>
                    <td style={tdStyle}>{option.reusableValues?.length ?? 0}</td>
                    <td style={tdStyle}>{option.productsCount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error ? <p style={errorStyle}>{error}</p> : null}
          {success ? <p style={successStyle}>{success}</p> : null}
        </section>
        <section
          style={{
            ...tableSectionStyle,
            display: activeTab === "categories" ? "grid" : "none",
          }}
        >
          <AdminCategoriesManager
            onCategoriesChange={async () => {
              await loadData();
            }}
          />
        </section>
      </section>
      {pendingRemoval ? (
        <div
          style={modalOverlayStyle}
          role="presentation"
          onClick={() => setPendingRemoval(null)}
        >
          <section
            style={modalCardStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-confirmation-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <p style={eyebrowStyle}>Confirmacion</p>
              <strong
                id="admin-confirmation-title"
                style={{ color: "var(--account-text-strong)", fontSize: 22, lineHeight: 1.1 }}
              >
                {pendingRemoval.kind === "option"
                  ? `Eliminar atributo "${pendingRemoval.optionName}"`
                  : pendingRemoval.kind === "value"
                    ? `Eliminar valor "${pendingRemoval.value}"`
                    : pendingRemoval.kind === "variant"
                      ? `Eliminar variante "${pendingRemoval.variantLabel}"`
                      : pendingRemoval.kind === "product"
                        ? `Eliminar producto "${pendingRemoval.productTitle}"`
                        : `Eliminar categoria "${pendingRemoval.categoryName}"`}
              </strong>
              <p style={copyStyle}>
                {pendingRemoval.kind === "option"
                  ? pendingRemoval.productsCount > 0
                    ? `Este atributo esta usado por ${pendingRemoval.productsCount} producto(s). Si confirmas, se quitara de todos esos productos.`
                    : "No hay productos afectados. La eliminacion es segura."
                  : pendingRemoval.kind === "value"
                    ? pendingRemoval.productsCount > 0
                      ? `Este valor esta usado por ${pendingRemoval.productsCount} producto(s) en el atributo "${pendingRemoval.optionName}". Si confirmas, se quitara de todos esos productos.`
                      : "No hay productos afectados. La eliminacion es segura."
                    : pendingRemoval.kind === "variant"
                      ? "La variante se quitara del borrador actual del producto."
                      : pendingRemoval.kind === "product"
                        ? "El producto se ocultara del catalogo y dejara de aparecer en el admin."
                        : pendingRemoval.productsCount > 0
                          ? `La categoria esta usada por ${pendingRemoval.productsCount} producto(s). Si confirmas, se quitara de todos esos productos y dejara de aparecer en el admin.`
                          : "No hay productos afectados. La categoria se ocultara del catalogo y dejara de aparecer en el admin."}
              </p>
            </div>
            <div style={modalActionsStyle}>
              <button
                type="button"
                onClick={() => setPendingRemoval(null)}
                style={ghostButtonStyle}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmRemoval()}
                style={primaryButtonStyle}
              >
                Confirmar eliminacion
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {pendingVariantSwitch ? (
        <div
          style={modalOverlayStyle}
          role="presentation"
          onClick={() => setPendingVariantSwitch(null)}
        >
          <section
            style={{
              ...modalCardStyle,
              width: "min(100%, 640px)",
              padding: "clamp(18px, 4vw, 30px)",
              borderRadius: "clamp(20px, 4vw, 28px)",
              gap: 18,
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="variant-discard-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <p
                style={{
                  ...eyebrowStyle,
                  color: "var(--account-text-soft)",
                }}
              >
                Cambios sin guardar
              </p>
              <strong
                id="variant-discard-title"
                style={{
                  color: "var(--account-text-strong)",
                  fontSize: "clamp(1.5rem, 4vw, 2rem)",
                  lineHeight: 1.08,
                }}
              >
                Hay cambios en la variante que todavia no guardaste.
              </strong>
              <p
                style={{
                  ...copyStyle,
                  color: "var(--account-text-muted)",
                  fontSize: "clamp(0.98rem, 2vw, 1.05rem)",
                }}
              >
                Puedes guardarlos antes de abrir otra variante o descartarlos para continuar.
              </p>
            </div>
            <div
              style={{
                ...modalActionsStyle,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                width: "100%",
              }}
            >
              <button
                type="button"
                onClick={() => setPendingVariantSwitch(null)}
                style={{ ...ghostButtonStyle, width: "100%", justifyContent: "center" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleVariantDiscard}
                style={{ ...ghostButtonStyle, width: "100%", justifyContent: "center" }}
              >
                Descartar cambios
              </button>
              <button
                type="button"
                onClick={handleVariantSaveAndContinue}
                style={{ ...primaryButtonStyle, width: "100%", justifyContent: "center" }}
              >
                Guardar
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {attributeDraft ? (
        <div style={modalOverlayStyle} role="presentation" onClick={closeAttributeModal}>
          <section
            style={attributeModalStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="attribute-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            {(() => {
              const option = attributeDraft.id
                ? options.find((item) => item.id === attributeDraft.id)
                : null;

              return (
                <>
                  <div style={betweenStyle}>
                    <div>
                      <p style={eyebrowStyle}>{attributeDraft.id ? "Editando atributo" : "Nuevo atributo"}</p>
                      <h3 id="attribute-modal-title" style={{ ...title3Style, marginTop: 6 }}>
                        {attributeDraft.name.trim() || "Atributo"}
                      </h3>
                    </div>
                    <button type="button" onClick={closeAttributeModal} style={ghostButtonStyle}>Cerrar</button>
                  </div>

                  <div style={responsiveVariantGridStyle}>
                    <input
                      value={attributeDraft.name}
                      onChange={(event) => setAttributeDraft((current) => current ? { ...current, name: event.target.value } : current)}
                      placeholder="Nombre del atributo"
                      style={fieldStyle}
                    />
                    <select
                      value={attributeDraft.attributeType}
                      onChange={(event) => setAttributeDraft((current) => current ? { ...current, attributeType: event.target.value as AttributeDraft["attributeType"] } : current)}
                      style={selectStyle}
                    >
                      <option value="text">Texto</option>
                      <option value="color">Color visual</option>
                      <option value="number">Numero</option>
                    </select>
                  </div>

                  {!attributeDraft.id ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      <textarea
                        value={attributeDraft.bulkValues}
                        onChange={(event) => setAttributeDraft((current) => current ? { ...current, bulkValues: event.target.value } : current)}
                        placeholder={"Valores iniciales\nBeige\nBlanco\nNegro\nChocolate"}
                        style={{ ...fieldStyle, minHeight: 130, resize: "vertical" }}
                      />
                      <span style={helperTextStyle}>Separá cada valor con Enter.</span>
                    </div>
                  ) : null}

                  {option ? (
                    <>
                      <div style={statsGridStyle}>
                        <Stat label="Valores" value={String(option.reusableValues?.length ?? 0)} />
                        <Stat label="Productos" value={String(option.productsCount ?? 0)} />
                        <Stat label="Creado" value={option.createdAt ? new Date(option.createdAt).toLocaleDateString("es-AR") : "-"} />
                        <Stat label="Actualizado" value={option.updatedAt ? new Date(option.updatedAt).toLocaleDateString("es-AR") : "-"} />
                      </div>

                      <section style={attributeModalSectionStyle}>
                        <strong>Valores</strong>
                        <div style={attributeChipGridStyle}>
                          {(option.reusableValues ?? []).map((value) => (
                            <div
                              key={value.id}
                              draggable
                              onDragStart={() => setDraggingAttributeValueId(value.id)}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => {
                                if (draggingAttributeValueId) void reorderAttributeValue(option.id, draggingAttributeValueId, value.id);
                                setDraggingAttributeValueId(null);
                              }}
                              style={attributeValueChipStyle}
                            >
                              {option.attributeType === "color" && value.visualColor ? <span style={colorSwatchStyle(value.visualColor)} /> : null}
                              {editingValueKey === `${option.id}:${value.value}` ? (
                                <input
                                  value={editingValueName}
                                  onChange={(event) => setEditingValueName(event.target.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") void saveOptionValue(option.id, value.value);
                                  }}
                                  style={chipInputStyle}
                                />
                              ) : (
                                <span>{value.value}</span>
                              )}
                              <span style={attributeChipActionsStyle}>
                                <button type="button" title="Renombrar" onClick={() => startEditingValue(option.id, value.value)} style={chipIconButtonStyle}>&#9998;</button>
                                <button type="button" title="Eliminar" onClick={() => setPendingRemoval({ kind: "value", optionId: option.id, optionName: option.name, value: value.value, productsCount: value.productsCount ?? 0 })} style={chipIconButtonStyle}>&times;</button>
                              </span>
                            </div>
                          ))}
                        </div>
                        <div style={rowWrapStyle}>
                          <input
                            value={attributeDraft.newValue}
                            onChange={(event) => setAttributeDraft((current) => current ? { ...current, newValue: event.target.value } : current)}
                            onKeyDown={async (event) => {
                              if (event.key !== "Enter" || !attributeDraft.newValue.trim()) return;
                              await createReusableAttributeValue(
                                option.id,
                                attributeDraft.newValue,
                                option.attributeType === "color" ? attributeDraft.newValueColor : undefined,
                              );
                              setAttributeDraft((current) => current ? { ...current, newValue: "" } : current);
                            }}
                            placeholder="+ Agregar valor"
                            style={{ ...fieldStyle, flex: "1 1 260px" }}
                          />
                          {option.attributeType === "color" ? (
                            <input
                              type="color"
                              value={attributeDraft.newValueColor}
                              onChange={(event) => setAttributeDraft((current) => current ? { ...current, newValueColor: event.target.value } : current)}
                              aria-label="Color visual"
                              style={colorPickerStyle}
                            />
                          ) : null}
                          <button
                            type="button"
                            onClick={async () => {
                              await createReusableAttributeValue(
                                option.id,
                                attributeDraft.newValue,
                                option.attributeType === "color" ? attributeDraft.newValueColor : undefined,
                              );
                              setAttributeDraft((current) => current ? { ...current, newValue: "" } : current);
                            }}
                            style={secondaryButtonStyle}
                          >
                            Agregar valor
                          </button>
                        </div>
                      </section>

                      <section style={attributeModalSectionStyle}>
                        <strong>Productos que utilizan este atributo</strong>
                        <div style={attributeProductsTableWrapStyle}>
                          <table style={tableStyle}>
                            <thead>
                              <tr>
                                <th style={thStyle}>Producto</th>
                                <th style={thStyle}>Variantes</th>
                                <th style={thStyle}>Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(option.products ?? []).map((product) => (
                                <tr key={product.id}>
                                  <td style={tdStyle}>{product.title}</td>
                                  <td style={tdStyle}>{product.variantsCount}</td>
                                  <td style={tdStyle}>
                                    <button type="button" onClick={() => void unlinkAttributeFromProduct(option, product)} style={ghostButtonStyle}>
                                      Quitar atributo
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    </>
                  ) : null}

                  <div style={modalActionsStyle}>
                    {attributeDraft.id ? (
                      <button type="button" onClick={() => setPendingRemoval({ kind: "option", optionId: attributeDraft.id!, optionName: attributeDraft.name, productsCount: option?.productsCount ?? 0 })} style={ghostButtonStyle}>
                        Eliminar
                      </button>
                    ) : null}
                    <button type="button" onClick={closeAttributeModal} style={ghostButtonStyle}>Cancelar</button>
                    <button type="button" onClick={() => void saveAttributeDraft()} style={primaryButtonStyle}>Guardar</button>
                  </div>
                </>
              );
            })()}
          </section>
        </div>
      ) : null}
      {toast ? (
        <div key={toast.id} role="status" aria-live="polite" style={toastStyle}>
          {toast.message}
        </div>
      ) : null}
      {duplicateSkuPrompt ? (
        <div
          style={modalOverlayStyle}
          role="presentation"
          onClick={() => setDuplicateSkuPrompt(null)}
        >
          <div
            style={modalCardStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="duplicate-sku-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <p style={eyebrowStyle}>SKU duplicado</p>
              <strong
                id="duplicate-sku-title"
                style={{ color: "var(--account-text-strong)", fontSize: 22, lineHeight: 1.1 }}
              >
                Ese codigo no se puede usar
              </strong>
              <p style={copyStyle}>
                Ya existe una variante con ese SKU. Quieres generar los SKU
                automaticamente para el producto &quot;
                {duplicateSkuPrompt.title}&quot;?
              </p>
            </div>
            <div style={modalActionsStyle}>
              <button
                type="button"
                onClick={() => setDuplicateSkuPrompt(null)}
                style={ghostButtonStyle}
              >
                No, volver atras
              </button>
              <button
                type="button"
                onClick={() => void saveProduct(true)}
                style={primaryButtonStyle}
              >
                Si
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AdminCategoriesManager({
  onCategoriesChange,
}: {
  onCategoriesChange?: () => Promise<void> | void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<CategoryDraft | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<{
    category: Category;
    action: "delete" | "reassign";
    reassignToId: string;
  } | null>(null);

  const showCategoryToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ id: Date.now(), message });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 2000);
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      setError("");
      const data = await api("/categories");
      setCategories(Array.isArray(data) ? scopeCategoriesToActiveStore(data as Category[]) : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar categorias.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const openCategoryModal = (category?: Category) => {
    setPendingImageFile(null);
    setDraft({
      id: category?.id ?? null,
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      description: category?.description ?? "",
      status: category?.status ?? "active",
      parentId: category?.parentId ? String(category.parentId) : "",
      imageUrl: category?.imageUrl ?? "",
    });
  };

  const uploadCategoryImage = async () => {
    if (!pendingImageFile) {
      return draft?.imageUrl ?? "";
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", pendingImageFile);
      const uploaded = await api("/store/admin/assets/upload", {
        method: "POST",
        body: formData,
      });
      return typeof uploaded?.url === "string" ? uploaded.url : "";
    } finally {
      setUploadingImage(false);
    }
  };

  const saveCategory = async () => {
    if (!draft?.name.trim()) {
      showCategoryToast("La categoria necesita un nombre.");
      return;
    }

    try {
      setSaving(true);
      const imageUrl = await uploadCategoryImage();
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        status: draft.status,
        parentId: draft.parentId ? Number(draft.parentId) : null,
        imageUrl: imageUrl || null,
      };
      const created = draft.id
        ? await api(`/categories/${draft.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await api("/categories", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      setCategories((current) =>
        draft.id
          ? current.map((category) =>
              category.id === draft.id ? (created as Category) : category,
            )
          : [created as Category, ...current],
      );
      setDraft(null);
      setPendingImageFile(null);
      await onCategoriesChange?.();
      await loadCategories();
      showCategoryToast(draft.id ? "Categoria actualizada." : "Categoria creada.");
    } catch (err) {
      showCategoryToast(
        err instanceof Error ? err.message : "No se pudo guardar la categoria.",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async () => {
    if (!pendingRemoval) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      const reassignQuery =
        pendingRemoval.action === "reassign" && pendingRemoval.reassignToId
          ? `?reassignTo=${pendingRemoval.reassignToId}`
          : "";
      await api(`/categories/${pendingRemoval.category.id}${reassignQuery}`, {
        method: "DELETE",
      });
      setCategories((current) =>
        current.filter((category) => category.id !== pendingRemoval.category.id),
      );
      setDraft(null);
      await onCategoriesChange?.();
      await loadCategories();
      showCategoryToast(`Categoria "${pendingRemoval.category.name}" eliminada.`);
      setPendingRemoval(null);
    } catch (err) {
      showCategoryToast(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar la categoria.",
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = categories.filter((category) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;
    return (
      category.name.toLowerCase().includes(normalized) ||
      category.slug.toLowerCase().includes(normalized)
    );
  });

  const availableParents = categories.filter((category) => category.id !== draft?.id);
  const replacementCategories = categories.filter(
    (category) => category.id !== pendingRemoval?.category.id,
  );
  const categoryPreviewUrl = useMemo(() => {
    if (pendingImageFile) {
      return URL.createObjectURL(pendingImageFile);
    }
    return draft?.imageUrl ? resolveAssetUrl(draft.imageUrl) ?? draft.imageUrl : "";
  }, [draft?.imageUrl, pendingImageFile]);

  useEffect(() => {
    return () => {
      if (categoryPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(categoryPreviewUrl);
      }
    };
  }, [categoryPreviewUrl]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (pendingRemoval) {
        setPendingRemoval(null);
        return;
      }

      if (draft) {
        setDraft(null);
        setPendingImageFile(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [draft, pendingRemoval]);

  return (
    <>
      <div style={catalogToolbarStyle}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar categorias"
          style={searchFieldStyle}
        />
        <button type="button" onClick={() => openCategoryModal()} style={primaryButtonStyle}>
          + Nueva categoria
        </button>
      </div>

      {loading ? (
        <StateCard label="Cargando categorias..." />
      ) : (
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Categoria</th>
                <th style={thStyle}>Productos</th>
                <th style={thStyle}>Subcategorias</th>
                <th style={thStyle}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category) => (
                <tr
                  key={category.id}
                  className="attribute-table-row"
                  onClick={() => openCategoryModal(category)}
                  style={selectableRowStyle}
                >
                  <td style={tdStyle}>
                    <div style={categoryCellStyle}>
                      {category.imageUrl ? (
                        <Image
                          src={resolveAssetUrl(category.imageUrl) ?? category.imageUrl}
                          alt={category.name}
                          width={96}
                          height={64}
                          unoptimized
                          style={categoryThumbStyle}
                        />
                      ) : (
                        <span style={categoryThumbPlaceholderStyle} />
                      )}
                      <div>
                        <strong>{category.name}</strong>
                        <span style={metaStyle}>/{category.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}>{category.productsCount ?? 0}</td>
                  <td style={tdStyle}>{category.childrenCount ?? 0}</td>
                  <td style={tdStyle}>{category.status === "hidden" ? "Oculta" : "Activa"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error ? <p style={errorStyle}>{error}</p> : null}

      {draft ? (
        <div style={modalOverlayStyle} role="presentation" onClick={() => setDraft(null)}>
          <section
            style={categoryModalStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div style={betweenStyle}>
              <div>
                <p style={eyebrowStyle}>{draft.id ? "Editando categoria" : "Nueva categoria"}</p>
                <h3 id="category-modal-title" style={{ ...title3Style, marginTop: 6 }}>
                  {draft.name.trim() || "Categoria"}
                </h3>
              </div>
              <button type="button" onClick={() => setDraft(null)} style={ghostButtonStyle}>
                Cerrar
              </button>
            </div>

            <div style={statsGridStyle}>
              <Stat label="Productos" value={String(categories.find((item) => item.id === draft.id)?.productsCount ?? 0)} />
              <Stat label="Publicados" value={String(categories.find((item) => item.id === draft.id)?.publishedProductsCount ?? 0)} />
              <Stat label="Sin stock" value={String(categories.find((item) => item.id === draft.id)?.outOfStockProductsCount ?? 0)} />
            </div>

            <section style={attributeModalSectionStyle}>
              <strong>Informacion general</strong>
              <div style={variantGridStyle}>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => current ? { ...current, name: event.target.value } : current)}
                  placeholder="Nombre"
                  style={fieldStyle}
                />
                <input value={draft.slug} placeholder="Slug automatico" style={fieldStyle} disabled />
                <select
                  value={draft.status}
                  onChange={(event) => setDraft((current) => current ? { ...current, status: event.target.value as CategoryDraft["status"] } : current)}
                  style={selectStyle}
                >
                  <option value="active">Activa</option>
                  <option value="hidden">Oculta</option>
                </select>
                <select
                  value={draft.parentId}
                  onChange={(event) => setDraft((current) => current ? { ...current, parentId: event.target.value } : current)}
                  style={selectStyle}
                >
                  <option value="">Categoria padre: Ninguna</option>
                  {availableParents.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={draft.description}
                onChange={(event) => setDraft((current) => current ? { ...current, description: event.target.value } : current)}
                placeholder="Descripcion"
                style={{ ...fieldStyle, minHeight: 110, resize: "vertical" }}
              />
            </section>

            <section style={attributeModalSectionStyle}>
              <strong>Imagen</strong>
              {categoryPreviewUrl ? (
                <Image
                  src={categoryPreviewUrl}
                  alt={draft.name || "Categoria"}
                  width={1200}
                  height={720}
                  unoptimized
                  style={categoryPreviewImageStyle}
                />
              ) : (
                <div style={categoryImageEmptyStyle}>Sin imagen</div>
              )}
              <div style={rowWrapStyle}>
                <label style={secondaryButtonStyle}>
                  {draft.imageUrl || pendingImageFile ? "Cambiar imagen" : "Subir imagen"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setPendingImageFile(event.target.files?.[0] ?? null)}
                    style={{ display: "none" }}
                  />
                </label>
                {(draft.imageUrl || pendingImageFile) ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPendingImageFile(null);
                      setDraft((current) => current ? { ...current, imageUrl: "" } : current);
                    }}
                    style={ghostButtonStyle}
                  >
                    Eliminar imagen
                  </button>
                ) : null}
              </div>
            </section>

            {draft.id ? (
              <section style={attributeModalSectionStyle}>
                <strong>Productos en esta categoria</strong>
                <div style={attributeProductsTableWrapStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Producto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(categories.find((item) => item.id === draft.id)?.products ?? []).map((product) => (
                        <tr key={product.id}>
                          <td style={tdStyle}>{product.title}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            <div style={modalActionsStyle}>
              {draft.id ? (
                <button
                  type="button"
                  onClick={() => {
                    const category = categories.find((item) => item.id === draft.id);
                    if (category) setPendingRemoval({ category, action: "delete", reassignToId: "" });
                  }}
                  style={ghostButtonStyle}
                >
                  Eliminar
                </button>
              ) : null}
              <button type="button" onClick={() => setDraft(null)} style={ghostButtonStyle}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void saveCategory()}
                style={primaryButtonStyle}
                disabled={saving || uploadingImage}
              >
                {saving || uploadingImage ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {pendingRemoval ? (
        <div
          style={modalOverlayStyle}
          role="presentation"
          onClick={() => setPendingRemoval(null)}
        >
          <section
            style={modalCardStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-confirmation-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <p style={eyebrowStyle}>Confirmacion</p>
              <strong
                id="category-confirmation-title"
                style={{ color: "var(--account-text-strong)", fontSize: 22, lineHeight: 1.1 }}
              >
                {`Eliminar categoria "${pendingRemoval.category.name}"`}
              </strong>
              <p style={copyStyle}>
                {Number(pendingRemoval.category.productsCount ?? 0) > 0
                  ? `Esta categoria esta siendo utilizada por ${pendingRemoval.category.productsCount} productos.`
                  : "No hay productos afectados."}
              </p>
              {Number(pendingRemoval.category.productsCount ?? 0) > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <label style={checkboxLabelStyle}>
                    <input
                      type="radio"
                      checked={pendingRemoval.action === "delete"}
                      onChange={() => setPendingRemoval((current) => current ? { ...current, action: "delete" } : current)}
                    />
                    Eliminar categoria y quitarla de los productos
                  </label>
                  <label style={checkboxLabelStyle}>
                    <input
                      type="radio"
                      checked={pendingRemoval.action === "reassign"}
                      onChange={() => setPendingRemoval((current) => current ? { ...current, action: "reassign" } : current)}
                    />
                    Reasignar productos a otra categoria
                  </label>
                  {pendingRemoval.action === "reassign" ? (
                    <select
                      value={pendingRemoval.reassignToId}
                      onChange={(event) => setPendingRemoval((current) => current ? { ...current, reassignToId: event.target.value } : current)}
                      style={selectStyle}
                    >
                      <option value="">Elegir categoria destino</option>
                      {replacementCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div style={modalActionsStyle}>
              <button
                type="button"
                onClick={() => setPendingRemoval(null)}
                style={ghostButtonStyle}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void removeCategory()}
                style={primaryButtonStyle}
                disabled={saving || (pendingRemoval.action === "reassign" && !pendingRemoval.reassignToId)}
              >
                {saving ? "Eliminando..." : pendingRemoval.action === "reassign" ? "Reasignar y eliminar" : "Eliminar categoria"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {toast ? (
        <div key={toast.id} role="status" aria-live="polite" style={toastStyle}>
          {toast.message}
        </div>
      ) : null}
    </>
  );
}

function AdminOrdersPanelSection() {
  const searchParams = useSearchParams();
  const detailTopRef = useRef<HTMLDivElement | null>(null);
  const ordersSignatureRef = useRef("");
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async (showInitialLoading = false, notifyOnChange = false) => {
      try {
        if (showInitialLoading) {
          setLoading(true);
        }

        const data = await api("/orders");
        if (!active) return;

        const nextOrders = Array.isArray(data) ? (data as CustomerOrder[]) : [];
        const nextSignature = buildOrdersSignature(nextOrders);
        const hasLoadedBefore = Boolean(ordersSignatureRef.current);
        const changed = hasLoadedBefore && ordersSignatureRef.current !== nextSignature;
        ordersSignatureRef.current = nextSignature;
        setOrders(nextOrders);
        setError("");

        if (notifyOnChange && changed) {
          window.dispatchEvent(new CustomEvent(ADMIN_ORDERS_UPDATED_EVENT));
        }
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error ? err.message : "No se pudieron cargar pedidos.",
        );
      } finally {
        if (active && showInitialLoading) {
          setLoading(false);
        }
      }
    };

    void load(true, false);

    const intervalId = window.setInterval(
      () => void load(false, true),
      ADMIN_ORDERS_POLL_INTERVAL_MS,
    );
    const handleFocus = () => void load(false, true);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void load(false, true);
      }
    };
    const handleOrdersUpdated = () => void load(false, false);

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(ADMIN_ORDERS_UPDATED_EVENT, handleOrdersUpdated);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(ADMIN_ORDERS_UPDATED_EVENT, handleOrdersUpdated);
    };
  }, []);

  useEffect(() => {
    const rawOrderId = searchParams.get("orderId");
    const nextOrderId = rawOrderId ? Number(rawOrderId) : NaN;

    if (!Number.isFinite(nextOrderId) || nextOrderId <= 0) {
      return;
    }

    if (selectedOrderId === nextOrderId) {
      return;
    }

    if (!orders.some((order) => order.id === nextOrderId)) {
      return;
    }

    setSelectedOrderId(nextOrderId);
    window.requestAnimationFrame(() => {
      detailTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [orders, searchParams, selectedOrderId]);

  const openOrderDetail = (orderId: number) => {
    setSelectedOrderId(orderId);
    window.requestAnimationFrame(() => {
      detailTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  return (
    <section style={panelStyle}>
      <Header
        title="Pedidos"
        copy="Vista operativa para detectar prioridad, entrar al detalle y llevar cada orden por una secuencia clara de trabajo."
      />
      {error ? <p style={errorStyle}>{error}</p> : null}
      <div ref={detailTopRef} />
      {selectedOrderId ? (
        <AdminOrderDetailPanel
          orderId={selectedOrderId}
          onBack={() => setSelectedOrderId(null)}
          onOrderUpdated={(updatedOrder) => {
            setOrders((current) =>
              current.map((order) =>
                order.id === updatedOrder.id
                  ? { ...order, ...updatedOrder }
                  : order,
              ),
            );
          }}
        />
      ) : null}
      {loading ? (
        <StateCard label="Cargando pedidos..." />
      ) : (
        <div style={ordersGridStyle}>
          {orders.map((order) => {
            const isNewOrder = order.status === "pending";
            const customerName =
              [order.customer?.firstName, order.customer?.lastName]
                .filter(Boolean)
                .join(" ")
                .trim() ||
              order.customer?.email ||
              "Cliente sin identificar";
            const units = order.items.reduce(
              (total, item) => total + item.quantity,
              0,
            );

            return (
              <article
                key={order.id}
                style={{
                  ...itemStyle,
                  ...(isNewOrder ? newOrderItemStyle : null),
                  cursor: "pointer",
                }}
                onClick={() => openOrderDetail(order.id)}
              >
                <div style={betweenStyle}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <strong style={{ display: "block", color: "var(--account-text-strong)" }}>
                        Pedido #{order.id}
                      </strong>
                      {isNewOrder ? <span style={newOrderBadgeStyle}>Nuevo</span> : null}
                    </div>
                    <span style={metaStyle}>
                      {new Date(order.createdAt).toLocaleString("es-AR")}
                    </span>
                  </div>
                  <strong style={{ color: "var(--account-text-strong)" }}>
                    {money(order.total)}
                  </strong>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <p style={copyStyle}>{customerName}</p>
                  <p style={copyStyle}>
                    {units} unidad{units === 1 ? "" : "es"} Â·{" "}
                    {isNewOrder ? "Pedido pendiente" : orderStatusLabel(order.status)}
                  </p>
                </div>

                <div style={rowWrapStyle}>
                  <span style={isNewOrder ? newOrderStatusChipStyle : statusChipStyle(order.status)}>
                    {orderStatusLabel(order.status)}
                  </span>
                  {order.shippingMethod ? (
                    <span style={softChipStyle}>{order.shippingMethod}</span>
                  ) : null}
                  {order.shipment?.trackingNumber ? (
                    <span style={softChipStyle}>Tracking listo</span>
                  ) : null}
                </div>

                <div style={betweenStyle}>
                  <span style={metaStyle}>
                    {order.items.length} linea
                    {order.items.length === 1 ? "" : "s"} de pedido
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openOrderDetail(order.id);
                    }}
                    style={ghostButtonStyle}
                  >
                    Ver detalle
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function buildOrdersSignature(orders: CustomerOrder[]) {
  return orders
    .map((order) => `${order.id}:${order.status}:${order.updatedAt ?? order.createdAt}`)
    .join("|");
}

// Legacy fallback kept temporarily while we consolidate the new operational panel.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AdminOrdersSection() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api("/orders");
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudieron cargar pedidos.",
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const updateStatus = async (orderId: number, status: string) => {
    try {
      setUpdatingId(orderId);
      const updated = await api(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId ? { ...order, ...updated } : order,
        ),
      );
      window.dispatchEvent(new CustomEvent(ADMIN_ORDERS_UPDATED_EVENT));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo actualizar el pedido.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section style={panelStyle}>
      <Header title="Pedidos" />
      {error ? <p style={errorStyle}>{error}</p> : null}
      {loading ? (
        <StateCard label="Cargando pedidos..." />
      ) : (
        orders.map((order) => (
          <article key={order.id} style={itemStyle}>
            <div style={betweenStyle}>
              <div>
                <strong style={{ display: "block", color: "var(--account-text-strong)" }}>
                  Pedido #{order.id}
                </strong>
                <span style={metaStyle}>
                  {new Date(order.createdAt).toLocaleDateString("es-AR")}
                </span>
              </div>
              <strong style={{ color: "var(--account-text-strong)" }}>{money(order.total)}</strong>
            </div>
            <p style={copyStyle}>
              {order.items.length} item{order.items.length === 1 ? "" : "s"} Ã¢â‚¬Â¢{" "}
              {orderStatusLabel(order.status)}
            </p>
            <select
              className="theme-select"
              defaultValue={order.status}
              disabled={updatingId === order.id}
              onChange={(event) =>
                void updateStatus(order.id, event.target.value)
              }
              style={selectStyle}
            >
              {statuses.map((status) => (
                <option key={status} value={status} style={optionStyle}>
                  {orderStatusLabel(status)}
                </option>
              ))}
            </select>
          </article>
        ))
      )}
    </section>
  );
}

function AdminCustomersSection() {
  const { isTabletOrSmaller, isPhone } = useViewportFlags();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [returns, setReturns] = useState<AdminReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "summary" | "customers" | "segments" | "alerts"
  >("summary");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [customersData, ordersData, returnsData] = await Promise.all([
          api("/customers"),
          api("/orders"),
          api("/returns"),
        ]);
        setCustomers(Array.isArray(customersData) ? customersData : []);
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setReturns(
          Array.isArray(returnsData) ? (returnsData as AdminReturn[]) : [],
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar clientes.",
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const customerRows = useMemo(() => {
    return customers.map((customer) => {
      const relatedOrders = orders.filter(
        (order) =>
          order.customer?.id === customer.id ||
          order.customerId === customer.id,
      );
      const relatedReturns = returns.filter((entry) =>
        relatedOrders.some((order) => order.id === entry.orderId),
      );
      const totalSpent = relatedOrders.reduce(
        (sum, order) => sum + Number(order.total ?? 0),
        0,
      );
      const lastOrder = [...relatedOrders].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];
      const firstOrder = [...relatedOrders].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )[0];
      const segment = getCustomerSegment({
        ordersCount: relatedOrders.length,
        totalSpent,
        lastOrderAt: lastOrder?.createdAt ?? null,
      });

      return {
        customer,
        ordersCount: relatedOrders.length,
        returnsCount: relatedReturns.length,
        totalSpent,
        lastOrderAt: lastOrder?.createdAt ?? null,
        firstOrderAt: firstOrder?.createdAt ?? null,
        averageTicket: relatedOrders.length
          ? totalSpent / relatedOrders.length
          : 0,
        segment,
      };
    });
  }, [customers, orders, returns]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return customerRows;

    return customerRows.filter(({ customer, segment }) => {
      const fullName = [customer.firstName, customer.lastName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        fullName.includes(normalizedQuery) ||
        customer.email.toLowerCase().includes(normalizedQuery) ||
        (customer.phone ?? "").toLowerCase().includes(normalizedQuery) ||
        segment.label.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [customerRows, query]);

  const metrics = useMemo(() => {
    const totalCustomers = customerRows.length;
    const customersWithOrders = customerRows.filter(
      (row) => row.ordersCount > 0,
    ).length;
    const recurringCustomers = customerRows.filter(
      (row) => row.ordersCount > 1,
    ).length;
    const vipCustomers = customerRows.filter(
      (row) => row.segment.id === "vip",
    ).length;
    const incompleteProfiles = customerRows.filter(
      (row) => !row.customer.phone,
    ).length;
    const totalRevenue = customerRows.reduce(
      (sum, row) => sum + row.totalSpent,
      0,
    );

    return {
      totalCustomers,
      customersWithOrders,
      recurringCustomers,
      vipCustomers,
      incompleteProfiles,
      totalRevenue,
    };
  }, [customerRows]);

  const segmentCards = useMemo(() => {
    const groups = new Map<
      string,
      { label: string; description: string; count: number }
    >();
    customerRows.forEach((row) => {
      const current = groups.get(row.segment.id) ?? {
        label: row.segment.label,
        description: row.segment.description,
        count: 0,
      };
      current.count += 1;
      groups.set(row.segment.id, current);
    });
    return [...groups.entries()].map(([id, value]) => ({ id, ...value }));
  }, [customerRows]);

  const alerts = useMemo(() => {
    return customerRows.flatMap((row) => {
      const items: Array<{ id: string; title: string; copy: string }> = [];
      const displayName = getCustomerDisplayName(row.customer);

      if (row.ordersCount === 0) {
        items.push({
          id: `no-orders-${row.customer.id}`,
          title: `${displayName} aun no compro`,
          copy: "Se registro en la tienda pero todavia no tiene pedidos asociados.",
        });
      }

      if (!row.customer.phone) {
        items.push({
          id: `missing-phone-${row.customer.id}`,
          title: `${displayName} sin telefono`,
          copy: "Conviene completar contacto para coordinar entregas o postventa.",
        });
      }

      if (row.returnsCount > 0) {
        items.push({
          id: `returns-${row.customer.id}`,
          title: `${displayName} tiene devoluciones`,
          copy: `${row.returnsCount} devolucion${row.returnsCount === 1 ? "" : "es"} registrada${row.returnsCount === 1 ? "" : "s"}.`,
        });
      }

      return items;
    });
  }, [customerRows]);

  return (
    <section style={panelStyle}>
      <Header
        title="Clientes"
        copy="Consulta clientes, compras y datos de contacto."
      />
      {error ? <p style={errorStyle}>{error}</p> : null}
      {loading ? (
        <StateCard label="Cargando clientes..." />
      ) : (
        <>
          <div style={statsGridStyle}>
            <Stat
              label="Clientes totales"
              value={String(metrics.totalCustomers)}
            />
            <Stat
              label="Con compra"
              value={String(metrics.customersWithOrders)}
            />
            <Stat
              label="Recurrentes"
              value={String(metrics.recurringCustomers)}
            />
            <Stat label="VIP" value={String(metrics.vipCustomers)} />
            <Stat
              label="Perfiles incompletos"
              value={String(metrics.incompleteProfiles)}
            />
            <Stat label="Facturacion" value={money(metrics.totalRevenue)} />
          </div>

          <section style={blockStyle}>
            <div style={betweenStyle}>
              <div>
                <p style={eyebrowStyle}>Relacion con clientes</p>
                <h3 style={title3Style}>Vista operativa</h3>
              </div>
              <div style={rowWrapStyle}>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por nombre, email, telefono o segmento"
                  style={{
                    ...searchFieldStyle,
                    minWidth: isTabletOrSmaller ? 0 : searchFieldStyle.minWidth,
                    width: isTabletOrSmaller ? "100%" : undefined,
                    flex: isTabletOrSmaller ? "1 1 100%" : "1 1 280px",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                ...tabRailStyle,
                flexWrap: isPhone ? "nowrap" : "wrap",
                overflowX: isPhone ? "auto" : "visible",
                paddingBottom: isPhone ? 6 : 0,
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab("summary")}
                style={workspaceTabStyle(activeTab === "summary")}
              >
                Resumen
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("customers")}
                style={workspaceTabStyle(activeTab === "customers")}
              >
                Clientes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("segments")}
                style={workspaceTabStyle(activeTab === "segments")}
              >
                Segmentos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("alerts")}
                style={workspaceTabStyle(activeTab === "alerts")}
              >
                Alertas
              </button>
            </div>

            {activeTab === "summary" ? (
              <div style={statsGridStyle}>
                <article style={statStyle}>
                  <span style={metaStyle}>
                    Ticket promedio por cliente activo
                  </span>
                  <strong style={{ color: "var(--account-text-strong)", fontSize: 28 }}>
                    {money(
                      metrics.customersWithOrders
                        ? metrics.totalRevenue / metrics.customersWithOrders
                        : 0,
                    )}
                  </strong>
                </article>
                <article style={statStyle}>
                  <span style={metaStyle}>Tasa de recompra</span>
                  <strong style={{ color: "var(--account-text-strong)", fontSize: 28 }}>
                    {metrics.customersWithOrders
                      ? `${Math.round((metrics.recurringCustomers / metrics.customersWithOrders) * 100)}%`
                      : "0%"}
                  </strong>
                </article>
                <article style={statStyle}>
                  <span style={metaStyle}>Clientes nuevos</span>
                  <strong style={{ color: "var(--account-text-strong)", fontSize: 28 }}>
                    {customerRows.filter((row) => row.ordersCount === 1).length}
                  </strong>
                </article>
                <article style={statStyle}>
                  <span style={metaStyle}>Sin compra</span>
                  <strong style={{ color: "var(--account-text-strong)", fontSize: 28 }}>
                    {customerRows.filter((row) => row.ordersCount === 0).length}
                  </strong>
                </article>
              </div>
            ) : null}

            {activeTab === "customers" ? (
              filteredRows.length ? (
                isTabletOrSmaller ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    {filteredRows.map((row) => (
                      <article key={row.customer.id} style={{ ...itemStyle, padding: isPhone ? 16 : 18 }}>
                        <div style={betweenStyle}>
                          <div>
                            <strong style={{ display: "block", color: "var(--account-text-strong)" }}>
                              {getCustomerDisplayName(row.customer)}
                            </strong>
                            <span style={metaStyle}>Cliente #{row.customer.id}</span>
                          </div>
                          <span style={customerSegmentStyle(row.segment.tone)}>
                            {row.segment.label}
                          </span>
                        </div>
                        <div style={{ display: "grid", gap: 4 }}>
                          <span>{row.customer.email}</span>
                          <span style={metaStyle}>
                            {row.customer.phone || "Sin telefono cargado"}
                          </span>
                        </div>
                        <div style={{ display: "grid", gap: 4 }}>
                          <span style={copyStyle}>
                            {row.ordersCount} pedidos Â· Promedio {money(row.averageTicket)}
                          </span>
                          <strong style={{ color: "var(--account-text-strong)" }}>{money(row.totalSpent)}</strong>
                          <span style={metaStyle}>
                            {row.lastOrderAt
                              ? `Ultima compra ${new Date(row.lastOrderAt).toLocaleDateString("es-AR")}`
                              : "Sin compras"}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div style={tableWrapStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Cliente</th>
                          <th style={thStyle}>Contacto</th>
                          <th style={thStyle}>Pedidos</th>
                          <th style={thStyle}>Facturacion</th>
                          <th style={thStyle}>Ultima compra</th>
                          <th style={thStyle}>Segmento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((row) => (
                          <tr key={row.customer.id}>
                            <td style={tdStyle}>
                              <strong style={{ display: "block", color: "var(--account-text-strong)" }}>
                                {getCustomerDisplayName(row.customer)}
                              </strong>
                              <span style={metaStyle}>
                                Cliente #{row.customer.id}
                              </span>
                            </td>
                            <td style={tdStyle}>
                              <div style={{ display: "grid", gap: 4 }}>
                                <span>{row.customer.email}</span>
                                <span style={metaStyle}>
                                  {row.customer.phone || "Sin telefono cargado"}
                                </span>
                              </div>
                            </td>
                            <td style={tdStyle}>
                              <div style={{ display: "grid", gap: 4 }}>
                                <span>{row.ordersCount}</span>
                                <span style={metaStyle}>
                                  Promedio {money(row.averageTicket)}
                                </span>
                              </div>
                            </td>
                            <td style={tdStyle}>{money(row.totalSpent)}</td>
                            <td style={tdStyle}>
                              {row.lastOrderAt
                                ? new Date(row.lastOrderAt).toLocaleDateString(
                                    "es-AR",
                                  )
                                : "Sin compras"}
                            </td>
                            <td style={tdStyle}>
                              <span
                                style={customerSegmentStyle(row.segment.tone)}
                              >
                                {row.segment.label}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <StateCard label="No encontramos clientes con ese filtro." />
              )
            ) : null}

            {activeTab === "segments" ? (
              <div style={statsGridStyle}>
                {segmentCards.map((segment) => (
                  <article key={segment.id} style={statStyle}>
                    <span style={metaStyle}>{segment.label}</span>
                    <strong style={{ color: "var(--account-text-strong)", fontSize: 28 }}>
                      {segment.count}
                    </strong>
                    <span style={copyStyle}>{segment.description}</span>
                  </article>
                ))}
              </div>
            ) : null}

            {activeTab === "alerts" ? (
              alerts.length ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {alerts.map((alert) => (
                    <article key={alert.id} style={itemStyle}>
                      <strong style={{ color: "var(--account-text-strong)" }}>{alert.title}</strong>
                      <p style={copyStyle}>{alert.copy}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <StateCard label="No hay alertas activas sobre clientes en este momento." />
              )
            ) : null}
          </section>
        </>
      )}
    </section>
  );
}

function Header({
  actions,
}: {
  title?: string;
  copy?: string;
  actions?: React.ReactNode;
}) {
  if (!actions) return null;

  return (
    <div style={{ ...betweenStyle, minWidth: 0, width: "100%" }}>
      <div
        style={{
          display: "grid",
          justifyItems: "end",
          gap: 10,
          minWidth: 0,
          flex: "1 1 320px",
          maxWidth: "min(100%, 520px)",
          marginLeft: "auto",
        }}
      >
        {actions}
      </div>
    </div>
  );
}

function Step({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ ...blockStyle, height: "100%" }}>
      <div>
        <p style={eyebrowStyle}>Carga</p>
        <h3 style={title3Style}>{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article style={statStyle}>
      <span style={metaStyle}>{label}</span>
      <strong style={{ color: "var(--account-text-strong)", fontSize: 28 }}>
        {value}
      </strong>
    </article>
  );
}

function StateCard({ label }: { label: string }) {
  return <div style={stateStyle}>{label}</div>;
}

function CatalogImageLayoutEditor({
  src,
  label,
  secondaryText,
  value,
  gridLines,
  orderLabel,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onChange,
  onRemove,
}: {
  src: string;
  label: string;
  secondaryText: string;
  value: ImageLayoutState;
  gridLines: number;
  orderLabel: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChange: (nextLayout: Partial<ImageLayoutState>) => void;
  onRemove: () => void;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
    startZoom: number;
    width: number;
    height: number;
  } | null>(null);
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchStateRef = useRef<{ distance: number; zoom: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  }, [onChange, value]);

  useEffect(() => {
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      onChangeRef.current({
        zoom: clampImageZoom(valueRef.current.zoom + direction * 0.08),
      });
    };

    stage.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      stage.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const stopDragging = () => {
    dragStateRef.current = null;
    activePointersRef.current.clear();
    pinchStateRef.current = null;
    setDragging(false);
  };

  const getPinchDistance = () => {
    const pointers = [...activePointersRef.current.values()];
    if (pointers.length < 2) return 0;
    return Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y);
  };

  return (
    <article style={imageEditorCardStyle}>
      <div style={catalogPreviewCardStyle}>
        <div
          ref={stageRef}
          style={{
            ...catalogPreviewEditorStageStyle,
            cursor: dragging ? "grabbing" : "grab",
          }}
          onPointerDown={(event) => {
            const rect = frameRef.current?.getBoundingClientRect();
            if (!rect) {
              return;
            }
            activePointersRef.current.set(event.pointerId, {
              x: event.clientX,
              y: event.clientY,
            });

            if (activePointersRef.current.size === 2) {
              pinchStateRef.current = {
                distance: getPinchDistance(),
                zoom: value.zoom,
              };
              dragStateRef.current = null;
              setDragging(false);
              event.currentTarget.setPointerCapture(event.pointerId);
              event.preventDefault();
              return;
            }

            dragStateRef.current = {
              startX: event.clientX,
              startY: event.clientY,
              startOffsetX: value.offsetX,
              startOffsetY: value.offsetY,
              startZoom: value.zoom,
              width: rect.width,
              height: rect.height,
            };
            setDragging(true);
            event.currentTarget.setPointerCapture(event.pointerId);
            event.preventDefault();
          }}
          onPointerMove={(event) => {
            if (activePointersRef.current.has(event.pointerId)) {
              activePointersRef.current.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY,
              });
            }

            if (pinchStateRef.current && activePointersRef.current.size >= 2) {
              const distance = getPinchDistance();
              if (pinchStateRef.current.distance > 0) {
                onChange({
                  zoom: clampImageZoom(
                    pinchStateRef.current.zoom * (distance / pinchStateRef.current.distance),
                  ),
                });
              }
              return;
            }

            if (!dragStateRef.current) {
              return;
            }

            const deltaX = event.clientX - dragStateRef.current.startX;
            const deltaY = event.clientY - dragStateRef.current.startY;
            const dragScale = Math.max(dragStateRef.current.startZoom, 1);

            onChange({
              offsetX: clampImageOffset(
                dragStateRef.current.startOffsetX +
                  (deltaX / (dragStateRef.current.width * dragScale)) * 100,
              ),
              offsetY: clampImageOffset(
                dragStateRef.current.startOffsetY +
                  (deltaY / (dragStateRef.current.height * dragScale)) * 100,
              ),
            });
          }}
          onPointerUp={(event) => {
            activePointersRef.current.delete(event.pointerId);
            if (activePointersRef.current.size < 2) {
              pinchStateRef.current = null;
            }
            if (activePointersRef.current.size === 0) {
              stopDragging();
            }
          }}
          onPointerCancel={stopDragging}
        >
          <Image
            src={src}
            alt={label}
            fill
            unoptimized
            draggable={false}
            sizes="(max-width: 900px) 100vw, 50vw"
            style={{
              ...catalogPreviewEditorImageStyle,
              ...getCatalogImageTransform(value),
            }}
          />
          <div ref={frameRef} style={catalogPreviewFrameStyle}>
            <div style={catalogPreviewCropMaskStyle} />
            <div style={catalogPreviewGridStyle(gridLines)} />
            <div style={catalogPreviewCenterGuideStyle} />
          </div>
        </div>

      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={imageEditorHeaderStyle}>
            <div style={{ display: "grid", gap: 4 }}>
              <strong style={{ color: "var(--account-text-strong)" }}>{label}</strong>
              {secondaryText ? <span style={metaStyle}>{secondaryText}</span> : null}
            </div>
            <div style={imageOrderControlStyle} aria-label={`Cambiar ${orderLabel.toLowerCase()}`}>
              <button
                type="button"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                title="Mover antes"
                aria-label="Mover antes"
                style={imageOrderButtonStyle(!canMoveUp)}
              >
                &larr;
              </button>
              <span style={imageOrderBadgeStyle}>{orderLabel}</span>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                title="Mover despues"
                aria-label="Mover despues"
                style={imageOrderButtonStyle(!canMoveDown)}
              >
                &rarr;
              </button>
            </div>
          </div>
        </div>
        <span style={metaStyle}>
          Arrastra desde cualquier punto de la imagen para moverla. Usa la
          rueda del mouse o pinch en pantalla tactil para acercar y alejar.
        </span>

        <div style={rowWrapStyle}>
          <button
            type="button"
            onClick={() => onChange({ offsetX: 0, offsetY: 0 })}
            style={ghostButtonStyle}
          >
            Centrar
          </button>
          <button
            type="button"
            onClick={() => onChange({ offsetX: 0, offsetY: 0, zoom: 1 })}
            style={ghostButtonStyle}
          >
            Restablecer
          </button>
          <button type="button" onClick={onRemove} style={ghostButtonStyle}>
            Quitar
          </button>
        </div>
      </div>
    </article>
  );
}

function sanitizeDecimalInput(value: string) {
  let normalized = value.replace(",", ".");
  normalized = normalized.replace(/[^0-9.]/g, "");

  const firstDotIndex = normalized.indexOf(".");

  if (firstDotIndex === -1) {
    return normalized;
  }

  return (
    normalized.slice(0, firstDotIndex + 1) +
    normalized.slice(firstDotIndex + 1).replace(/\./g, "")
  );
}

function parsePriceInput(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = String(value ?? "").trim();
  if (!raw) return 0;

  const cleaned = raw.replace(/[^\d.,-]/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const decimalSeparator =
    lastComma > lastDot ? "," : lastDot > lastComma ? "." : "";
  const normalized = decimalSeparator
    ? cleaned
        .replace(new RegExp(`\\${decimalSeparator === "," ? "." : ","}`, "g"), "")
        .replace(decimalSeparator, ".")
    : cleaned.replace(/[.,]/g, "");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitizeIntegerInput(value: string) {
  return value.replace(/\D/g, "");
}

function SuggestionInput({
  value,
  onChange,
  placeholder,
  suggestions,
  sanitize,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  suggestions: string[];
  sanitize?: (value: string) => string;
}) {
  const [open, setOpen] = useState(false);

  const filteredSuggestions = useMemo(() => {
    const query = value.trim().toLowerCase();

    if (!query) {
      return suggestions.slice(0, 6);
    }

    return suggestions
      .filter((item) => item.toLowerCase().includes(query) && item !== value)
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(query) ? 0 : 1;
        const bStarts = b.toLowerCase().startsWith(query) ? 0 : 1;
        return aStarts - bStarts || a.localeCompare(b);
      })
      .slice(0, 6);
  }, [suggestions, value]);

  return (
    <div style={suggestionFieldWrapStyle}>
      <input
        value={value}
        onChange={(event) => {
          onChange(sanitize ? sanitize(event.target.value) : event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
          }

          if (event.key === "Tab" && open && filteredSuggestions.length > 0) {
            onChange(filteredSuggestions[0]);
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        style={fieldStyle}
        autoComplete="off"
        inputMode={sanitize ? "decimal" : undefined}
      />
      {open && filteredSuggestions.length > 0 ? (
        <div style={suggestionDropdownStyle}>
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(suggestion);
                setOpen(false);
              }}
              style={suggestionItemStyle}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getCustomerDisplayName(customer: Customer) {
  return (
    [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() ||
    "Sin nombre"
  );
}

function getCustomerSegment({
  ordersCount,
  totalSpent,
  lastOrderAt,
}: {
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}) {
  if (ordersCount === 0) {
    return {
      id: "lead",
      label: "Lead",
      description: "Se registro pero aun no hizo compras.",
      tone: "neutral" as const,
    };
  }

  if (ordersCount >= 4 || totalSpent >= 300000) {
    return {
      id: "vip",
      label: "VIP",
      description: "Cliente de alto valor con recurrencia fuerte.",
      tone: "success" as const,
    };
  }

  if (ordersCount >= 2) {
    return {
      id: "frequent",
      label: "Frecuente",
      description: "Ya repitio compra y conviene cuidarlo.",
      tone: "info" as const,
    };
  }

  if (lastOrderAt) {
    const daysSinceLastOrder = Math.floor(
      (Date.now() - new Date(lastOrderAt).getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceLastOrder > 120) {
      return {
        id: "inactive",
        label: "Inactivo",
        description: "Hace tiempo que no vuelve a comprar.",
        tone: "warning" as const,
      };
    }
  }

  return {
    id: "new",
    label: "Nuevo",
    description: "Realizo su primera compra recientemente.",
    tone: "soft" as const,
  };
}

const panelStyle: React.CSSProperties = {
  display: "grid",
  gap: 24,
  minWidth: 0,
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
};
const shellStyle: React.CSSProperties = { display: "grid", gap: 18 };
const topGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 18,
  alignItems: "stretch",
};
const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: 16,
};
const ordersGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(min(260px,100%),1fr))",
  gap: 16,
};
const twoColumnStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(280px,0.38fr) minmax(0,1fr)",
  gap: 20,
  alignItems: "start",
};
const optionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
  gap: 12,
};
const optionValuesAreaStyle: React.CSSProperties = {
  minHeight: 124,
  alignContent: "start",
};
const optionActionsStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  alignContent: "end",
  marginTop: "auto",
  alignSelf: "end",
};
const selectedValuesBlockStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  marginTop: 14,
};
const variantGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
  gap: 12,
};
const chipRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};
const attributePickerGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};
const attributePickerStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  alignContent: "start",
  minWidth: 0,
};
const attributeDetailStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  padding: 18,
  borderRadius: 18,
  border: "1px solid var(--checkout-border)",
  background: "var(--page-panel-bg)",
};
const attributeModalSectionStyle: React.CSSProperties = {
  ...attributeDetailStyle,
  padding: 16,
};
const attributeChipGridStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
};
const attributeValueChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  minHeight: 38,
  padding: "8px 10px 8px 12px",
  borderRadius: 999,
  border: "1px solid var(--checkout-border)",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-strong)",
  cursor: "grab",
};
const attributeChipActionsStyle: React.CSSProperties = {
  display: "inline-flex",
  gap: 4,
};
const chipIconButtonStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 999,
  border: "1px solid var(--checkout-border)",
  background: "var(--page-panel-bg)",
  color: "var(--account-text-strong)",
  cursor: "pointer",
  lineHeight: 1,
};
const chipInputStyle: React.CSSProperties = {
  width: 120,
  border: "none",
  outline: "none",
  background: "transparent",
  color: "var(--account-text-strong)",
};
const colorSwatchStyle = (color: string): React.CSSProperties => ({
  width: 14,
  height: 14,
  borderRadius: 999,
  border: "1px solid var(--checkout-border-strong)",
  background: color,
  flex: "0 0 auto",
});
const colorPickerStyle: React.CSSProperties = {
  width: 52,
  minHeight: 48,
  padding: 6,
  border: "1px solid var(--checkout-border)",
  borderRadius: 14,
  background: "var(--muted-field-bg)",
  cursor: "pointer",
};
const rowWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};
const betweenStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};
const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 16,
  flexWrap: "wrap",
};
const tabRailStyle: React.CSSProperties = {
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  justifyContent: "start",
  alignItems: "center",
  gap: 10,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  overflowX: "auto",
  overflowY: "hidden",
  paddingBottom: 4,
  scrollbarWidth: "thin",
};
const tableWrapStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  overflowX: "auto",
  boxSizing: "border-box",
};
const categoryCellStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 220,
};
const categoryThumbStyle: React.CSSProperties = {
  width: 52,
  height: 38,
  borderRadius: 10,
  objectFit: "cover",
  border: "1px solid var(--checkout-border)",
  background: "var(--muted-field-bg)",
  flex: "0 0 auto",
};
const categoryThumbPlaceholderStyle: React.CSSProperties = {
  ...categoryThumbStyle,
  display: "inline-block",
};
const categoryPreviewImageStyle: React.CSSProperties = {
  width: "100%",
  maxHeight: 240,
  objectFit: "cover",
  borderRadius: 18,
  border: "1px solid var(--checkout-border)",
  background: "var(--muted-field-bg)",
};
const categoryImageEmptyStyle: React.CSSProperties = {
  display: "grid",
  placeItems: "center",
  minHeight: 150,
  borderRadius: 18,
  border: "1px dashed var(--checkout-border-strong)",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-soft)",
};
const attributeProductsTableWrapStyle: React.CSSProperties = {
  ...tableWrapStyle,
  maxHeight: 360,
  overflowY: "auto",
  borderBottom: "1px solid var(--checkout-border)",
};
const selectableRowStyle: React.CSSProperties = {
  cursor: "pointer",
};
const fieldStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  padding: "14px 16px",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-strong)",
  border: "1px solid var(--checkout-border)",
  borderRadius: 16,
  outline: "none",
  boxSizing: "border-box",
};
const smallFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  padding: "12px 14px",
};
const searchFieldStyle: React.CSSProperties = {
  ...smallFieldStyle,
  width: "100%",
  minWidth: 280,
  maxWidth: 420,
};
const selectStyle: React.CSSProperties = {
  ...fieldStyle,
  width: "100%",
  maxWidth: 260,
  background: "var(--select-bg)",
  color: "var(--select-color)",
  appearance: "auto",
};
const largeFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  minHeight: 58,
  fontSize: 18,
};
const modernWorkspaceStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
  width: "100%",
  minWidth: 0,
};
const wizardStepperStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10,
};
const wizardStepButtonStyle = (active: boolean): React.CSSProperties => ({
  minHeight: 52,
  borderRadius: 14,
  border: active ? "1px solid var(--accent-strong)" : "1px solid var(--checkout-border)",
  background: active ? "var(--accent-strong)" : "var(--page-panel-strong-bg)",
  color: active ? "var(--accent-contrast)" : "var(--account-text-strong)",
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: 700,
});
const wizardPanelStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--checkout-border)",
  background: "var(--page-panel-bg)",
  padding: 20,
  display: "grid",
  gap: 14,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  minHeight: 460,
  alignContent: "start",
};
const wizardTwoColumnStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
  gap: 16,
  alignItems: "start",
};
const wizardSubpanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 14,
  minWidth: 0,
};
const publicationGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};
const publicationChoiceStyle = (active: boolean): React.CSSProperties => ({
  minHeight: 120,
  borderRadius: 18,
  border: active ? "2px solid var(--accent-strong)" : "1px solid var(--checkout-border)",
  background: active ? "rgba(115, 181, 165, 0.72)" : "rgba(115, 181, 165, 0.22)",
  color: "var(--account-text-strong)",
  fontWeight: 800,
  cursor: "pointer",
});
const catalogToolbarStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};
const iconActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
};
const iconButtonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: "1px solid var(--checkout-border)",
  background: "var(--page-panel-strong-bg)",
  color: "var(--account-text-strong)",
  display: "inline-grid",
  placeItems: "center",
  cursor: "pointer",
  fontWeight: 800,
};
const productThumbStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 10,
  objectFit: "cover",
  border: "1px solid var(--checkout-border)",
};
const productThumbEmptyStyle: React.CSSProperties = {
  display: "inline-block",
  width: 48,
  height: 48,
  borderRadius: 10,
  background: "var(--muted-field-bg)",
  border: "1px solid var(--checkout-border)",
};
const compactCellInputStyle: React.CSSProperties = {
  width: 92,
  padding: "9px 10px",
  borderRadius: 10,
  border: "1px solid var(--checkout-border)",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-strong)",
  outline: "none",
  boxSizing: "border-box",
};
const imageEditorGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
  gap: 16,
};
const imageEditorCardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 380,
  justifySelf: "center",
  borderRadius: 22,
  border: "1px solid var(--checkout-border)",
  background: "var(--page-panel-strong-bg)",
  padding: 14,
  display: "grid",
  gap: 14,
};
const catalogPreviewCardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 320,
  minWidth: 0,
  justifySelf: "center",
  borderRadius: 24,
  overflow: "hidden",
  border: "1px solid var(--checkout-border)",
  background: "var(--page-panel-strong-bg)",
};
const catalogPreviewFrameStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  width: "100%",
  height: "100%",
  border: "1px solid var(--admin-preview-frame-border)",
  background: "transparent",
  pointerEvents: "none",
};
const catalogPreviewEditorImageStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  display: "block",
  pointerEvents: "none",
};
function catalogPreviewGridStyle(lines: number): React.CSSProperties {
  if (lines <= 0) {
    return {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      backgroundImage: "none",
    };
  }

  const cells = lines + 1;
  const size = `${100 / cells}% ${100 / cells}%`;

  return {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    backgroundImage:
      "linear-gradient(var(--admin-preview-gridline) 1px, transparent 1px), linear-gradient(90deg, var(--admin-preview-gridline) 1px, transparent 1px)",
    backgroundSize: size,
  };
}
const catalogPreviewEditorStageStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "1 / 1",
  minHeight: 0,
  height: "auto",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  background: "var(--admin-preview-stage-bg)",
  touchAction: "none",
  userSelect: "none",
};
const catalogPreviewCropMaskStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  boxShadow: "0 0 0 999px var(--admin-preview-crop-mask)",
  pointerEvents: "none",
};
const catalogPreviewCenterGuideStyle: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  width: 12,
  height: 12,
  marginLeft: -6,
  marginTop: -6,
  borderRadius: 999,
  border: "1px solid var(--admin-preview-guide-border)",
  background: "var(--admin-preview-guide-bg)",
  pointerEvents: "none",
};
const imageEditorHeaderStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "start",
  gap: 12,
};
const imageOrderBadgeStyle: React.CSSProperties = {
  width: "fit-content",
  padding: "8px 9px",
  borderRadius: 999,
  border: "1px solid var(--checkout-border)",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-muted)",
  fontSize: 12,
  whiteSpace: "nowrap",
};
const imageOrderControlStyle: React.CSSProperties = {
  justifySelf: "end",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: 4,
  borderRadius: 999,
  border: "1px solid var(--checkout-border)",
  background: "var(--page-panel-bg)",
};
const imageOrderButtonStyle = (disabled: boolean): React.CSSProperties => ({
  width: 32,
  height: 32,
  borderRadius: 999,
  border: "1px solid var(--checkout-border-strong)",
  background: disabled ? "transparent" : "var(--muted-field-bg)",
  color: disabled ? "var(--account-text-soft)" : "var(--account-text-strong)",
  cursor: disabled ? "not-allowed" : "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
  lineHeight: 1,
});
const suggestionFieldWrapStyle: React.CSSProperties = { position: "relative" };
const suggestionDropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  zIndex: 50,
  borderRadius: 18,
  border: "1px solid var(--checkout-border-strong)",
  background: "var(--page-panel-strong-bg)",
  boxShadow: "0 18px 42px rgba(79, 151, 191, 0.12)",
  padding: 8,
  display: "grid",
  gap: 6,
  maxHeight: 240,
  overflowY: "auto",
};
const suggestionItemStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 12,
  border: "1px solid transparent",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-strong)",
  textAlign: "left",
  cursor: "pointer",
};
const primaryButtonStyle: React.CSSProperties = {
  padding: "14px 18px",
  background: "var(--accent-strong)",
  color: "var(--accent-contrast)",
  border: "none",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 700,
};
const secondaryButtonStyle: React.CSSProperties = {
  padding: "10px 14px",
  background: "transparent",
  color: "var(--account-text-strong)",
  border: "1px solid var(--checkout-border-strong)",
  borderRadius: 999,
  cursor: "pointer",
};
const fullWidthSecondaryButtonStyle: React.CSSProperties = {
  ...secondaryButtonStyle,
  width: "fit-content",
};
const ghostButtonStyle: React.CSSProperties = {
  padding: "10px 14px",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-strong)",
  border: "1px solid var(--checkout-border)",
  borderRadius: 999,
  cursor: "pointer",
};
const blockStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--checkout-border)",
  background: "var(--page-panel-bg)",
  padding: 20,
  display: "grid",
  gap: 14,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};
const editingBannerStyle: React.CSSProperties = {
  ...blockStyle,
  gridTemplateColumns: "minmax(0,1fr) auto",
  alignItems: "center",
  gap: 12,
};
const itemStyle: React.CSSProperties = { ...blockStyle, gap: 10 };
const newOrderItemStyle: React.CSSProperties = {
  border: "1px solid var(--admin-tone-warning-border, var(--checkout-border-strong))",
  background:
    "linear-gradient(180deg, color-mix(in srgb, var(--admin-tone-warning-bg, var(--page-panel-bg)) 78%, var(--page-panel-bg) 22%), var(--page-panel-bg))",
  boxShadow:
    "0 0 0 3px color-mix(in srgb, var(--admin-tone-warning-color, var(--account-text-strong)) 10%, transparent)",
};
const groupPanelStyle: React.CSSProperties = { ...blockStyle, gap: 18 };
const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1200,
  background: "var(--admin-overlay-bg)",
  backdropFilter: "blur(8px)",
  display: "grid",
  placeItems: "center",
  padding: 20,
};
const modalCardStyle: React.CSSProperties = {
  width: "min(100%, 560px)",
  maxHeight: "min(88vh, 720px)",
  overflowY: "auto",
  borderRadius: 28,
  border: "1px solid var(--checkout-border-strong)",
  background: "var(--page-panel-strong-bg)",
  boxShadow: "var(--admin-modal-shadow)",
  padding: 24,
  display: "grid",
  gap: 20,
};
const attributeModalStyle: React.CSSProperties = {
  ...modalCardStyle,
  width: "min(100%, 980px)",
  maxHeight: "min(92vh, 900px)",
};
const categoryModalStyle: React.CSSProperties = {
  ...attributeModalStyle,
  width: "min(100%, 1040px)",
};
const modalActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  flexWrap: "wrap",
};
const optionCardStyle: React.CSSProperties = {
  ...blockStyle,
  padding: 16,
  alignContent: "stretch",
  minHeight: 360,
  gridTemplateRows: "auto minmax(0, 1fr) auto",
};
const tableSectionStyle: React.CSSProperties = { ...blockStyle, gap: 16 };
const statStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--checkout-border)",
  background: "var(--admin-stat-bg)",
  padding: 22,
  display: "grid",
  gap: 8,
};
const stateStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--checkout-border-strong)",
  background: "var(--page-panel-strong-bg)",
  padding: 24,
  color: "var(--account-text-muted)",
};
const metaStyle: React.CSSProperties = {
  color: "var(--account-text-soft)",
  fontSize: 13,
};
const helperTextStyle: React.CSSProperties = {
  color: "var(--account-text-soft)",
  fontSize: 13,
  lineHeight: 1.4,
};
const checkboxLabelStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  color: "var(--account-text-strong)",
};
const copyStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--account-text-muted)",
  lineHeight: 1.7,
  maxWidth: 720,
};
const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  fontSize: 12,
  color: "var(--account-text-soft)",
};
const title3Style: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: 22,
  color: "var(--account-text-strong)",
};
const catalogTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--account-text-strong)",
  fontSize: 26,
  fontWeight: 800,
};
const checkStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "var(--account-text-strong)",
};
const errorStyle: React.CSSProperties = { margin: 0, color: "#ff9f9f" };
const successStyle: React.CSSProperties = { margin: 0, color: "#b8f5c2" };
const toastStyle: React.CSSProperties = {
  position: "fixed",
  right: 24,
  bottom: 24,
  zIndex: 1200,
  maxWidth: "min(360px, calc(100vw - 32px))",
  padding: "14px 18px",
  borderRadius: 18,
  border: "1px solid var(--checkout-border-strong)",
  background: "var(--page-panel-strong-bg)",
  color: "var(--account-text-strong)",
  boxShadow: "0 18px 44px rgba(0, 0, 0, 0.18)",
  fontWeight: 800,
  animation: "productToastIn 180ms ease-out",
};
const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};
const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0 0 12px",
  borderBottom: "1px solid var(--checkout-border)",
  color: "var(--account-text-soft)",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
};
const tdStyle: React.CSSProperties = {
  padding: "14px 0",
  borderBottom: "1px solid var(--checkout-border)",
  color: "var(--account-text-strong)",
  verticalAlign: "top",
};
const optionStyle: React.CSSProperties = {
  background: "var(--select-bg)",
  color: "var(--select-color)",
};
const statusStyle = (published: boolean): React.CSSProperties => ({
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  border: published
    ? "1px solid var(--admin-tone-success-border)"
    : "1px solid var(--admin-status-idle-border)",
  background: published
    ? "var(--admin-tone-success-bg)"
    : "var(--admin-status-idle-bg)",
  color: published
    ? "var(--admin-tone-success-color)"
    : "var(--admin-status-idle-color)",
  fontSize: 12,
});
const productCatalogStatusStyle = (status: string): React.CSSProperties => ({
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  border:
    status === "Publicado"
      ? "1px solid var(--admin-tone-success-border)"
      : status === "Sin stock"
        ? "1px solid var(--admin-danger-border)"
        : "1px solid var(--admin-status-idle-border)",
  background:
    status === "Publicado"
      ? "var(--admin-tone-success-bg)"
      : status === "Sin stock"
        ? "var(--admin-danger-bg)"
        : "var(--admin-status-idle-bg)",
  color:
    status === "Publicado"
      ? "var(--admin-tone-success-color)"
      : status === "Sin stock"
        ? "var(--admin-danger-color)"
        : "var(--admin-status-idle-color)",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
});
const statusChipStyle = (status: string): React.CSSProperties => ({
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  border:
    status === "cancelled"
      ? "1px solid var(--admin-danger-border)"
      : status === "delivered"
        ? "1px solid var(--admin-tone-success-border)"
        : status === "shipped"
          ? "1px solid var(--admin-tone-info-border)"
          : "1px solid var(--admin-status-idle-border)",
  background:
    status === "cancelled"
      ? "var(--admin-danger-bg)"
      : status === "delivered"
        ? "var(--admin-tone-success-bg)"
        : status === "shipped"
          ? "var(--admin-tone-info-bg)"
          : "var(--admin-status-idle-bg)",
  color:
    status === "cancelled"
      ? "var(--admin-danger-color)"
      : status === "delivered"
        ? "var(--admin-tone-success-color)"
        : status === "shipped"
          ? "var(--admin-tone-info-color)"
          : "var(--admin-status-idle-color)",
  fontSize: 12,
});
const newOrderBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid var(--admin-tone-warning-border, var(--checkout-border-strong))",
  background: "var(--notification-badge-bg, #ff3b30)",
  color: "var(--notification-badge-color, #fff)",
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1,
};
const newOrderStatusChipStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid var(--admin-tone-warning-border, var(--checkout-border-strong))",
  background: "var(--admin-tone-warning-bg, var(--account-item-bg-active))",
  color: "var(--admin-tone-warning-color, var(--account-text-strong))",
  fontSize: 12,
  fontWeight: 700,
};
const softChipStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid var(--checkout-border)",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-muted)",
  fontSize: 12,
};
const workspaceTabStyle = (active: boolean): React.CSSProperties => ({
  flex: "0 0 auto",
  padding: "10px 14px",
  borderRadius: 999,
  border: active
    ? "1px solid var(--checkout-border-strong)"
    : "1px solid var(--checkout-border)",
  background: active ? "var(--accent-strong)" : "var(--page-panel-strong-bg)",
  color: active ? "var(--accent-contrast)" : "var(--account-text-strong)",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
});
const customerSegmentStyle = (
  tone: "neutral" | "soft" | "info" | "success" | "warning",
): React.CSSProperties => {
  const palette = {
    neutral: {
      background: "var(--admin-status-idle-bg)",
      border: "var(--admin-status-idle-border)",
      color: "var(--admin-status-idle-color)",
    },
    soft: {
      background: "var(--admin-tone-soft-bg)",
      border: "var(--admin-tone-soft-border)",
      color: "var(--admin-tone-soft-color)",
    },
    info: {
      background: "var(--admin-tone-info-bg)",
      border: "var(--admin-tone-info-border)",
      color: "var(--admin-tone-info-color)",
    },
    success: {
      background: "var(--admin-tone-success-bg)",
      border: "var(--admin-tone-success-border)",
      color: "var(--admin-tone-success-color)",
    },
    warning: {
      background: "var(--admin-tone-warning-bg)",
      border: "var(--admin-tone-warning-border)",
      color: "var(--admin-tone-warning-color)",
    },
  } as const;

  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${palette[tone].border}`,
    background: palette[tone].background,
    color: palette[tone].color,
    fontSize: 12,
    fontWeight: 700,
  };
};
const chipToggleStyle = (selected: boolean): React.CSSProperties => ({
  flex: "0 0 auto",
  minWidth: 44,
  maxWidth: 128,
  height: 40,
  padding: "9px 12px",
  borderRadius: 999,
  border: selected
    ? "1px solid var(--admin-chip-selected-border)"
    : "1px solid var(--admin-chip-border)",
  background: selected
    ? "var(--admin-chip-selected-bg)"
    : "var(--admin-chip-bg)",
  color: selected
    ? "var(--admin-chip-selected-color)"
    : "var(--admin-chip-color)",
  boxShadow: selected ? "var(--admin-chip-selected-shadow)" : "none",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});
const removeChipStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid var(--admin-danger-border)",
  background: "var(--admin-danger-bg)",
  color: "var(--admin-danger-color)",
  cursor: "pointer",
};
