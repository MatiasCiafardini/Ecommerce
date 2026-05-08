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
  images?: Array<{
    id: number;
    url: string;
    position?: number;
    offsetX?: number;
    offsetY?: number;
    zoom?: number;
  }>;
  variants?: Array<{ id: number }>;
  categories?: Array<{ category: { id: number; name: string } }>;
};

type ProductStockRow = {
  id: number;
  title: string;
  slug: string;
  published: boolean;
  categories: string[];
  variantsCount: number;
  totalStock: number;
  lowStockVariants: number;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
  productsCount?: number;
  storeId?: number | null;
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
  productsCount?: number;
  usageCount?: number;
  reusableValues?: Array<{ id: number; value: string; productsCount?: number }>;
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
      <div style={betweenStyle}>
        <div>
          <p style={eyebrowStyle}>Configuracion</p>
          <h2 style={title2Style}>Ajustes de la tienda</h2>
          <p style={copyStyle}>Gestiona los datos operativos que se reflejan en el checkout.</p>
        </div>
      </div>

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
  | "create"
  | "catalog"
  | "stock"
  | "options"
  | "categories";

function AdminProductsSection({
  initialTab = "create",
}: {
  initialTab?: ProductAdminTab;
}) {
  const { isTabletOrSmaller, isPhone } = useViewportFlags();
  const searchParams = useSearchParams();
  const formTopRef = useRef<HTMLDivElement | null>(null);
  const optionInUseRef = useRef<HTMLElement | null>(null);
  const optionIdleRef = useRef<HTMLElement | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockRows, setStockRows] = useState<ProductStockRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(false);
  const [publishingProductIds, setPublishingProductIds] = useState<number[]>(
    [],
  );
  const [saving, setSaving] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState<{
    total: number;
    uploaded: number;
  } | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<number | null>(null);
  const [creatingOption, setCreatingOption] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<ProductAdminTab>(initialTab);
  const [newOptionName, setNewOptionName] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [stockQuery, setStockQuery] = useState("");
  const [optionQuery, setOptionQuery] = useState("");
  const [stockCategoryFilter, setStockCategoryFilter] = useState("all");
  const [stockPublishedFilter, setStockPublishedFilter] = useState<
    "all" | "published" | "draft"
  >("all");
  const [editingOptionId, setEditingOptionId] = useState<number | null>(null);
  const [editingOptionName, setEditingOptionName] = useState("");
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
    };
  }, []);

  const loadStockData = async (sourceProducts: Product[]) => {
    setStockLoading(true);
    try {
      const rows = await Promise.all(
        sourceProducts.map(async (product) => {
          const variantsData = await api(`/variants/${product.id}`);
          const variants = Array.isArray(variantsData) ? variantsData : [];
          const totalStock = variants.reduce(
            (sum, variant) =>
              sum + Number(variant.inventories?.[0]?.quantity ?? 0),
            0,
          );
          const lowStockVariants = variants.filter((variant) => {
            const quantity = Number(variant.inventories?.[0]?.quantity ?? 0);
            return quantity > 0 && quantity <= 3;
          }).length;

          return {
            id: product.id,
            title: product.title,
            slug: product.slug,
            published: product.published,
            categories: (product.categories ?? []).map(
              (entry) => entry.category.name,
            ),
            variantsCount: variants.length,
            totalStock,
            lowStockVariants,
          };
        }),
      );

      setStockRows(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar stock.");
    } finally {
      setStockLoading(false);
    }
  };

  useEffect(() => {
    if (
      activeTab !== "stock" ||
      loading ||
      stockRows.length > 0 ||
      products.length === 0
    ) {
      return;
    }

    void loadStockData(products);
  }, [activeTab, loading, products, stockRows.length]);

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

    if (!query) {
      return products;
    }

    return products.filter((product) => {
      const categoryText = (product.categories ?? [])
        .map((entry) => entry.category.name)
        .join(" ")
        .toLowerCase();

      return (
        product.title.toLowerCase().includes(query) ||
        product.slug.toLowerCase().includes(query) ||
        categoryText.includes(query)
      );
    });
  }, [productQuery, products]);

  const filteredStockRows = useMemo(() => {
    const query = stockQuery.trim().toLowerCase();

    return stockRows.filter((row) => {
      const matchesQuery =
        !query ||
        row.title.toLowerCase().includes(query) ||
        row.slug.toLowerCase().includes(query) ||
        row.categories.join(" ").toLowerCase().includes(query);

      const matchesCategory =
        stockCategoryFilter === "all" ||
        row.categories.includes(stockCategoryFilter);

      const matchesPublished =
        stockPublishedFilter === "all" ||
        (stockPublishedFilter === "published" ? row.published : !row.published);

      return matchesQuery && matchesCategory && matchesPublished;
    });
  }, [stockCategoryFilter, stockPublishedFilter, stockQuery, stockRows]);

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

  const optionGroups = useMemo(() => {
    const inUse = filteredOptions.filter(
      (option) => Number(option.productsCount ?? 0) > 0,
    );
    const idle = filteredOptions.filter(
      (option) => Number(option.productsCount ?? 0) === 0,
    );

    return { inUse, idle };
  }, [filteredOptions]);

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
    setLoadedOptionValues([]);
    setDraftOptionValues({});
    setVariantDraft(emptyVariant());
    setEditingVariantIndex(null);
    setVariantDraftInitialState(null);
    setPendingVariantSwitch(null);
    setVariants([]);
    setImageUploadProgress(null);
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
              { id: Date.now(), value },
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
          : "No se pudo guardar el valor de la etiqueta.",
      );
    }
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

  const loadVariantIntoDraft = (index: number) => {
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
  };

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

  const clearVariantDraft = () => {
    setVariantDraft(emptyVariant());
    setEditingVariantIndex(null);
    setVariantDraftInitialState(null);
  };

  const addVariant = () => {
    const normalized = normalizeVariant(variantDraft);

    if (!normalized.sku || !normalized.price) {
      setError("Cada variante necesita al menos SKU y precio.");
      return false;
    }

    const duplicateIndex = variants.findIndex(
      (item, itemIndex) =>
        item.sku.trim().toLowerCase() === normalized.sku.toLowerCase() &&
        item.id !== normalized.id &&
        itemIndex !== editingVariantIndex,
    );

    if (duplicateIndex >= 0) {
      setError("Ya existe otra variante con ese SKU.");
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

  const handleVariantDiscard = () => {
    const nextIndex = pendingVariantSwitch?.nextIndex ?? null;
    clearVariantDraft();
    setPendingVariantSwitch(null);
    if (nextIndex !== null) {
      loadVariantIntoDraft(nextIndex);
    }
  };

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

    if (!draftIsEmpty) {
      if (!normalizedDraft.sku || !normalizedDraft.price) {
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
    try {
      setCreatingOption(true);
      await api("/product-options", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      await loadOptions();
      setNewOptionName("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo crear la etiqueta.",
      );
    } finally {
      setCreatingOption(false);
    }
  };

  const startEditingOption = (option: ProductOption) => {
    setEditingOptionId(option.id);
    setEditingOptionName(option.name);
  };

  const saveOptionName = async (optionId: number) => {
    const name = editingOptionName.trim();
    if (!name) {
      setError("La etiqueta necesita un nombre.");
      return;
    }

    try {
      setSavingOptionKey(`option-${optionId}`);
      setError("");
      await api(`/product-options/${optionId}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      await loadOptions();
      setEditingOptionId(null);
      setEditingOptionName("");
      setSuccess("Etiqueta actualizada.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la etiqueta.",
      );
    } finally {
      setSavingOptionKey(null);
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
          ? "Etiqueta eliminada de todos los productos."
          : "Etiqueta eliminada.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo eliminar la etiqueta.",
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
          `Valor eliminado. La etiqueta "${updatedOption.name}" sigue creada y ahora aparece en "Etiquetas sin uso".`,
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
      const nextProducts = await loadData();
      setSuccess(`Producto "${productTitle}" eliminado.`);
      if (editingProductId === productId) {
        resetForm();
      }
      if (activeTab === "stock") {
        await loadStockData(nextProducts);
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
      const nextProducts = await loadData();
      setSelectedCategoryIds((current) =>
        current.filter((id) => id !== categoryId),
      );
      setSuccess(`Categoria "${categoryName}" eliminada.`);
      if (activeTab === "stock") {
        await loadStockData(nextProducts);
      }
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

  const scrollToOptionGroup = (group: "inUse" | "idle") => {
    const target =
      group === "inUse" ? optionInUseRef.current : optionIdleRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
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
              width: String(variant.packageWidthCm ?? variant.width ?? ""),
              height: String(variant.packageHeightCm ?? variant.height ?? ""),
              length: String(variant.packageLengthCm ?? variant.length ?? ""),
            }))
          : [];

        setVariants(safeVariants);
        clearVariantDraft();
        setActiveTab("create");

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
    [imageFiles],
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
        reject(new Error(`Sin conexión al subir ${fileEntry.name}. Revisá tu red y reintentá.`));
      };

      xhr.ontimeout = () => {
        reject(new Error(`${fileEntry.name} tardó demasiado en subir. Intentá de nuevo con mejor señal.`));
      };

      xhr.onload = () => {
        if (xhr.status === 413) {
          reject(new Error(`${fileEntry.name} superó el límite del servidor. Intentá con una imagen más pequeña.`));
          return;
        }

        if (xhr.status < 200 || xhr.status >= 300) {
          let errorMessage = `Error al subir ${fileEntry.name} (código ${xhr.status}).`;
          try {
            const parsed = JSON.parse(xhr.responseText) as { message?: string | string[] };
            const msg = Array.isArray(parsed.message)
              ? parsed.message.join(", ")
              : parsed.message;
            if (msg) errorMessage = msg;
          } catch {
            // Response is not JSON (e.g. nginx HTML error) — use the generic message
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
    categoryIds: selectedCategoryIds,
    optionValues: buildOptionValuesToPersist(),
    variants: variantsToSync.map((variant) => ({
      ...(variant.id ? { id: variant.id } : {}),
      sku: variant.sku.trim(),
      price: Number(variant.price),
      Size: variant.Size.trim() || null,
      Color: variant.Color.trim() || null,
      inventoryQuantity: variant.inventoryQuantity.trim()
        ? Number(variant.inventoryQuantity)
        : 0,
      weightGrams: variant.weight.trim() ? Number(variant.weight) : null,
      packageWidthCm: variant.width.trim() ? Number(variant.width) : null,
      packageHeightCm: variant.height.trim() ? Number(variant.height) : null,
      packageLengthCm: variant.length.trim() ? Number(variant.length) : null,
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
    }),
    [form],
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
          (variant) => !variant.sku.trim() || !variant.price.trim(),
        )
      ) {
        setError("Cada variante cargada necesita al menos SKU y precio.");
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
      if (activeTab === "stock") {
        await loadStockData(nextProducts);
      }
      const refreshedProduct = nextProducts.find((item) => item.id === productId);

      if (wasEditing && refreshedProduct && !hasPendingImageUploads) {
        await hydrateFormFromProduct(refreshedProduct);
      } else if (!hasPendingImageUploads) {
        resetForm();
      }

      if (imageSyncError) {
        setError(imageSyncError);
        setSuccess(
          wasEditing
            ? "El producto se actualizo, pero algunas imagenes no se pudieron guardar."
            : "El producto se creo, pero algunas imagenes no se pudieron guardar.",
        );
        return;
      }

      if (hasPendingImageUploads) {
        if (!wasEditing) {
          setEditingProductId(productId);
        }

        void processPendingImageUploads(productId);
        setSuccess(
          wasEditing
            ? "Producto actualizado. Las imagenes siguen subiendo en segundo plano."
            : "Producto creado. Las imagenes siguen subiendo en segundo plano.",
        );
        return;
      }

      setSuccess(
        wasEditing
          ? "Producto actualizado desde el formulario principal."
          : "Producto creado con su carga completa.",
      );
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
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const updateProductPublishedState = async (
    productId: number,
    published: boolean,
  ) => {
    const previousProducts = products;
    const previousStockRows = stockRows;

    try {
      setError("");
      setPublishingProductIds((current) => [
        ...new Set([...current, productId]),
      ]);
      setProducts((current) =>
        current.map((product) =>
          product.id === productId ? { ...product, published } : product,
        ),
      );
      setStockRows((current) =>
        current.map((row) =>
          row.id === productId ? { ...row, published } : row,
        ),
      );

      await api(`/products/${productId}`, {
        method: "PATCH",
        body: JSON.stringify({ published }),
      });
      setSuccess(
        published
          ? "Producto publicado desde la vista de stock."
          : "Producto despublicado desde la vista de stock.",
      );
    } catch (err) {
      setProducts(previousProducts);
      setStockRows(previousStockRows);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la publicacion.",
      );
    } finally {
      setPublishingProductIds((current) =>
        current.filter((id) => id !== productId),
      );
    }
  };

  return (
    <section style={panelStyle}>
      <Header
        title="Productos"
        copy="Gestiona altas, catalogo, stock, etiquetas y categorias."
      />
      <div ref={formTopRef} />
      <section style={stackedSectionStyle}>
        <div style={{ display: "grid", gap: 14, minWidth: 0, width: "100%" }}>
          <div>
            <p style={eyebrowStyle}>Gestion del catalogo</p>
            <h3 style={{ ...title3Style, marginTop: 8 }}>
              Alta, catalogo y stock
            </h3>
          </div>
          <div style={responsiveTabRailStyle}>
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              style={workspaceTabStyle(activeTab === "create")}
            >
              Alta
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("catalog")}
              style={workspaceTabStyle(activeTab === "catalog")}
            >
              Catalogo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("stock")}
              style={workspaceTabStyle(activeTab === "stock")}
            >
              Stock
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("options")}
              style={workspaceTabStyle(activeTab === "options")}
            >
              Etiquetas
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
        <section
          style={{
            ...responsiveShellStyle,
            display: activeTab === "create" ? "grid" : "none",
          }}
        >
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
                    secondaryText={`${(entry.file.size / 1024 / 1024).toFixed(2)} MB · ${
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

          <Step title="Etiquetas reutilizables">
            <div style={rowWrapStyle}>
              <input
                value={newOptionName}
                onChange={(event) => setNewOptionName(event.target.value)}
                placeholder="Crear nueva etiqueta"
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
        </section>

        <section
          style={{
            ...stackedSectionStyle,
            display: activeTab === "catalog" ? "grid" : "none",
          }}
        >
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
                        {product.images?.length ?? 0} imagenes · {product.variants?.length ?? 0} variantes
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
        </section>
        <section
          style={{
            ...stackedSectionStyle,
            display: activeTab === "stock" ? "grid" : "none",
          }}
        >
          <div style={betweenStyle}>
            <div>
              <p style={eyebrowStyle}>Stock operativo</p>
              <h3 style={{ ...title3Style, marginTop: 8 }}>
                Busqueda, filtros y visibilidad
              </h3>
            </div>
            <div style={rowWrapStyle}>
              <input
                value={stockQuery}
                onChange={(event) => setStockQuery(event.target.value)}
                placeholder="Buscar por nombre, slug o categoria"
                style={responsiveSearchFieldStyle}
              />
              <select
                className="theme-select"
                value={stockCategoryFilter}
                onChange={(event) => setStockCategoryFilter(event.target.value)}
                style={responsiveSelectStyle}
              >
                <option value="all">Todas las categorias</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select
                className="theme-select"
                value={stockPublishedFilter}
                onChange={(event) =>
                  setStockPublishedFilter(
                    event.target.value as "all" | "published" | "draft",
                  )
                }
                style={responsiveSelectStyle}
              >
                <option value="all">Todos</option>
                <option value="published">Publicados</option>
                <option value="draft">No publicados</option>
              </select>
              <button
                type="button"
                onClick={() => void loadStockData(products)}
                style={secondaryButtonStyle}
              >
                Recargar stock
              </button>
            </div>
          </div>
          {stockLoading ? (
            <StateCard label="Cargando stock..." />
          ) : (
            isTabletOrSmaller ? (
              <div style={{ display: "grid", gap: 12 }}>
                {filteredStockRows.map((row) => (
                  <article key={row.id} style={{ ...itemStyle, padding: isPhone ? 16 : 18 }}>
                    <div style={betweenStyle}>
                      <div>
                        <strong style={{ display: "block", color: "#111" }}>
                          {row.title}
                        </strong>
                        <span style={{ ...metaStyle, color: "#111" }}>/{row.slug}</span>
                      </div>
                      <strong style={{ color: row.totalStock <= 0 ? "#c73a3a" : "#111" }}>
                        {row.totalStock}
                      </strong>
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <span style={{ ...metaStyle, color: "#111" }}>
                        {row.categories.join(", ") || "Sin categorias"}
                      </span>
                      <span style={{ ...copyStyle, color: "#111" }}>
                        {row.variantsCount} variantes ·{" "}
                        {row.lowStockVariants > 0
                          ? `${row.lowStockVariants} con stock bajo`
                          : row.totalStock <= 0
                            ? "Sin stock"
                            : "Stock OK"}
                      </span>
                    </div>
                    <div style={betweenStyle}>
                      <label style={publishToggleCellStyle}>
                        <input
                          type="checkbox"
                          checked={row.published}
                          disabled={publishingProductIds.includes(row.id)}
                          onChange={() =>
                            void updateProductPublishedState(
                              row.id,
                              !row.published,
                            )
                          }
                        />
                        <span style={{ ...metaStyle, color: "#111" }}>
                          {publishingProductIds.includes(row.id)
                            ? "Guardando..."
                            : row.published
                              ? "Publicado"
                              : "Borrador"}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const product = products.find((item) => item.id === row.id);
                          if (product) {
                            void hydrateFormFromProduct(product);
                          }
                        }}
                        style={ghostButtonStyle}
                      >
                        Editar
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
                      <th style={thStyle}>Categorias</th>
                      <th style={thStyle}>Variantes</th>
                      <th style={thStyle}>Stock total</th>
                      <th style={thStyle}>Stock bajo</th>
                      <th style={thStyle}>Publicar</th>
                      <th style={thStyle}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStockRows.map((row) => (
                      <tr key={row.id}>
                        <td style={tdStyle}>
                          <strong style={{ display: "block", color: "#111" }}>
                            {row.title}
                          </strong>
                          <span style={{ ...metaStyle, color: "#111" }}>/{row.slug}</span>
                        </td>
                        <td style={tdStyle}>
                          {row.categories.join(", ") || "Sin categorias"}
                        </td>
                        <td style={tdStyle}>{row.variantsCount}</td>
                        <td style={tdStyle}>
                          <strong
                            style={{
                              color: row.totalStock <= 0 ? "#c73a3a" : "#111",
                            }}
                          >
                            {row.totalStock}
                          </strong>
                        </td>
                        <td style={tdStyle}>
                          {row.lowStockVariants > 0
                            ? `${row.lowStockVariants} variante${row.lowStockVariants === 1 ? "" : "s"} con poco stock`
                            : row.totalStock <= 0
                              ? "Sin stock"
                              : "Stock OK"}
                        </td>
                        <td style={tdStyle}>
                          <label style={publishToggleCellStyle}>
                            <input
                              type="checkbox"
                              checked={row.published}
                              disabled={publishingProductIds.includes(row.id)}
                              onChange={() =>
                                void updateProductPublishedState(
                                  row.id,
                                  !row.published,
                                )
                              }
                            />
                            <span style={{ ...metaStyle, color: "#111" }}>
                              {publishingProductIds.includes(row.id)
                                ? "Guardando..."
                                : row.published
                                  ? "Si"
                                  : "No"}
                            </span>
                          </label>
                        </td>
                        <td style={tdStyle}>
                          <div style={rowWrapStyle}>
                            <button
                              type="button"
                              onClick={() => {
                                const product = products.find(
                                  (item) => item.id === row.id,
                                );
                                if (product) {
                                  void hydrateFormFromProduct(product);
                                }
                              }}
                              style={ghostButtonStyle}
                            >
                              Editar
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
          {error ? <p style={errorStyle}>{error}</p> : null}
          {success ? <p style={successStyle}>{success}</p> : null}
        </section>
        <section
          style={{
            ...stackedSectionStyle,
            display: activeTab === "options" ? "grid" : "none",
          }}
        >
          <div style={betweenStyle}>
            <div>
              <p style={eyebrowStyle}>Base de catalogo</p>
              <h3 style={{ ...title3Style, marginTop: 8 }}>
                Etiquetas y valores
              </h3>
              <p style={copyStyle}>
                Las etiquetas se pueden renombrar o eliminar. Si una etiqueta o
                un valor ya esta en uso, la interfaz te avisa antes de quitarlo
                de los productos.
              </p>
            </div>
            <div style={rowWrapStyle}>
              <input
                value={optionQuery}
                onChange={(event) => setOptionQuery(event.target.value)}
                placeholder="Buscar por etiqueta o valor"
                style={responsiveSearchFieldStyle}
              />
              <button
                type="button"
                onClick={() => void loadOptions()}
                style={secondaryButtonStyle}
              >
                Recargar etiquetas
              </button>
            </div>
          </div>

          <div style={{ ...blockStyle, padding: 16 }}>
            <div style={rowWrapStyle}>
              <input
                value={newOptionName}
                onChange={(event) => setNewOptionName(event.target.value)}
                placeholder="Crear nueva etiqueta"
                style={smallFieldStyle}
              />
              <button
                type="button"
                onClick={createOption}
                disabled={creatingOption || !newOptionName.trim()}
                style={secondaryButtonStyle}
              >
                {creatingOption ? "Creando..." : "Crear etiqueta"}
              </button>
            </div>
            <span style={metaStyle}>
              Los valores se generan cuando se asignan a productos y desde aca
              despues los podes renombrar o quitar.
            </span>
          </div>

          <div style={statsGridStyle}>
            <button
              type="button"
              onClick={() => scrollToOptionGroup("inUse")}
              style={metricCardButtonStyle}
            >
              <Stat
                label="Etiquetas en uso"
                value={String(optionGroups.inUse.length)}
              />
            </button>
            <button
              type="button"
              onClick={() => scrollToOptionGroup("idle")}
              style={metricCardButtonStyle}
            >
              <Stat
                label="Etiquetas sin uso"
                value={String(optionGroups.idle.length)}
              />
            </button>
            <Stat
              label="Valores totales"
              value={String(
                filteredOptions.reduce(
                  (sum, option) => sum + (option.reusableValues?.length ?? 0),
                  0,
                ),
              )}
            />
          </div>

          {filteredOptions.length ? (
            <>
              <OptionGroupSection
                sectionRef={optionInUseRef}
                title="Etiquetas en uso"
                copy="Estas impactan productos publicados o en borrador, asi que cualquier eliminacion requiere confirmacion."
                options={optionGroups.inUse}
                editingOptionId={editingOptionId}
                editingOptionName={editingOptionName}
                setEditingOptionName={setEditingOptionName}
                saveOptionName={saveOptionName}
                setEditingOptionId={setEditingOptionId}
                setEditingValueKey={setEditingValueKey}
                setEditingValueName={setEditingValueName}
                startEditingOption={startEditingOption}
                savingOptionKey={savingOptionKey}
                setPendingRemoval={setPendingRemoval}
                editingValueKey={editingValueKey}
                editingValueName={editingValueName}
                saveOptionValue={saveOptionValue}
                startEditingValue={startEditingValue}
              />

              <OptionGroupSection
                sectionRef={optionIdleRef}
                title="Etiquetas sin uso"
                copy="Estas no estan asociadas a productos en este momento. Son buenas candidatas para limpiar o renombrar."
                options={optionGroups.idle}
                editingOptionId={editingOptionId}
                editingOptionName={editingOptionName}
                setEditingOptionName={setEditingOptionName}
                saveOptionName={saveOptionName}
                setEditingOptionId={setEditingOptionId}
                setEditingValueKey={setEditingValueKey}
                setEditingValueName={setEditingValueName}
                startEditingOption={startEditingOption}
                savingOptionKey={savingOptionKey}
                setPendingRemoval={setPendingRemoval}
                editingValueKey={editingValueKey}
                editingValueName={editingValueName}
                saveOptionValue={saveOptionValue}
                startEditingValue={startEditingValue}
              />
            </>
          ) : (
            <StateCard label="No encontramos etiquetas con ese filtro." />
          )}

          {error ? <p style={errorStyle}>{error}</p> : null}
          {success ? <p style={successStyle}>{success}</p> : null}
        </section>
        <section
          style={{
            ...tableSectionStyle,
            display: activeTab === "categories" ? "grid" : "none",
          }}
        >
          <div style={betweenStyle}>
            <div>
              <p style={eyebrowStyle}>Gestion centralizada</p>
              <h3 style={{ ...title3Style, marginTop: 8 }}>Categorias</h3>
            </div>
          </div>
          <AdminCategoriesManager
            onCategoriesChange={async () => {
              const nextProducts = await loadData();
              if (activeTab === "stock") {
                await loadStockData(nextProducts);
              }
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
                  ? `Eliminar etiqueta "${pendingRemoval.optionName}"`
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
                    ? `Esta etiqueta esta usada por ${pendingRemoval.productsCount} producto(s). Si confirmas, se quitara de todos esos productos.`
                    : "No hay productos afectados. La eliminacion es segura."
                  : pendingRemoval.kind === "value"
                    ? pendingRemoval.productsCount > 0
                      ? `Este valor esta usado por ${pendingRemoval.productsCount} producto(s) en la etiqueta "${pendingRemoval.optionName}". Si confirmas, se quitara de todos esos productos.`
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

function OptionGroupSection({
  sectionRef,
  title,
  copy,
  options,
  editingOptionId,
  editingOptionName,
  setEditingOptionName,
  saveOptionName,
  setEditingOptionId,
  setEditingValueKey,
  setEditingValueName,
  startEditingOption,
  savingOptionKey,
  setPendingRemoval,
  editingValueKey,
  editingValueName,
  saveOptionValue,
  startEditingValue,
}: {
  sectionRef?: React.RefObject<HTMLElement | null>;
  title: string;
  copy: string;
  options: ProductOption[];
  editingOptionId: number | null;
  editingOptionName: string;
  setEditingOptionName: (value: string) => void;
  saveOptionName: (optionId: number) => Promise<void>;
  setEditingOptionId: (value: number | null) => void;
  setEditingValueKey: (value: string | null) => void;
  setEditingValueName: (value: string) => void;
  startEditingOption: (option: ProductOption) => void;
  savingOptionKey: string | null;
  setPendingRemoval: (value: PendingOptionRemoval | null) => void;
  editingValueKey: string | null;
  editingValueName: string;
  saveOptionValue: (optionId: number, currentValue: string) => Promise<void>;
  startEditingValue: (optionId: number, value: string) => void;
}) {
  return (
    <section ref={sectionRef} style={groupPanelStyle}>
      <div style={betweenStyle}>
        <div>
          <p style={eyebrowStyle}>{title}</p>
          <p style={copyStyle}>{copy}</p>
        </div>
        <span style={softChipStyle}>{options.length} etiqueta(s)</span>
      </div>

      {options.length ? (
        <div style={optionGridStyle}>
          {options.map((option) => (
            <article
              key={option.id}
              style={{ ...optionCardStyle, minHeight: 0 }}
            >
              <div style={betweenStyle}>
                <div style={{ display: "grid", gap: 6 }}>
                  {editingOptionId === option.id ? (
                    <div style={rowWrapStyle}>
                      <input
                        value={editingOptionName}
                        onChange={(event) =>
                          setEditingOptionName(event.target.value)
                        }
                        style={smallFieldStyle}
                      />
                      <button
                        type="button"
                        onClick={() => void saveOptionName(option.id)}
                        disabled={
                          savingOptionKey === `option-${option.id}` ||
                          !editingOptionName.trim()
                        }
                        style={secondaryButtonStyle}
                      >
                        {savingOptionKey === `option-${option.id}`
                          ? "Guardando..."
                          : "Guardar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingOptionId(null);
                          setEditingOptionName("");
                        }}
                        style={ghostButtonStyle}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <strong style={{ color: "var(--account-text-strong)" }}>{option.name}</strong>
                      <span style={metaStyle}>
                        {option.productsCount ?? 0} producto(s) -{" "}
                        {(option.reusableValues ?? []).length} valor(es)
                      </span>
                    </>
                  )}
                </div>
                {editingOptionId !== option.id ? (
                  <div style={rowWrapStyle}>
                    <button
                      type="button"
                      onClick={() => startEditingOption(option)}
                      style={ghostButtonStyle}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPendingRemoval({
                          kind: "option",
                          optionId: option.id,
                          optionName: option.name,
                          productsCount: Number(option.productsCount ?? 0),
                        })
                      }
                      disabled={savingOptionKey === `option-${option.id}`}
                      style={ghostButtonStyle}
                    >
                      {savingOptionKey === `option-${option.id}`
                        ? "Eliminando..."
                        : "Eliminar"}
                    </button>
                  </div>
                ) : null}
              </div>

              {(option.reusableValues ?? []).length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {(option.reusableValues ?? []).map((value) => {
                    const valueKey = `${option.id}:${value.value.toLowerCase()}`;
                    const isEditingValue = editingValueKey === valueKey;
                    const isSavingValue =
                      savingOptionKey === `value-${valueKey}`;

                    return (
                      <div key={valueKey} style={valueItemStyle}>
                        {isEditingValue ? (
                          <>
                            <div style={{ display: "grid", gap: 10 }}>
                              <input
                                value={editingValueName}
                                onChange={(event) =>
                                  setEditingValueName(event.target.value)
                                }
                                style={smallFieldStyle}
                              />
                            </div>
                            <div style={valueActionsRowStyle}>
                              <button
                                type="button"
                                onClick={() =>
                                  void saveOptionValue(option.id, value.value)
                                }
                                disabled={
                                  isSavingValue || !editingValueName.trim()
                                }
                                style={compactActionButtonStyle}
                              >
                                {isSavingValue ? "Guardando..." : "Guardar"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingValueKey(null);
                                  setEditingValueName("");
                                }}
                                style={compactGhostButtonStyle}
                              >
                                Cancelar
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ display: "grid", gap: 4 }}>
                              <strong style={{ color: "var(--account-text-strong)" }}>
                                {value.value}
                              </strong>
                              <span style={metaStyle}>
                                {value.productsCount ?? 0} producto(s) usando
                                este valor
                              </span>
                            </div>
                            <div style={valueActionsRowStyle}>
                              <button
                                type="button"
                                onClick={() =>
                                  startEditingValue(option.id, value.value)
                                }
                                style={compactGhostButtonStyle}
                              >
                                Renombrar
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingRemoval({
                                    kind: "value",
                                    optionId: option.id,
                                    optionName: option.name,
                                    value: value.value,
                                    productsCount: Number(
                                      value.productsCount ?? 0,
                                    ),
                                  })
                                }
                                disabled={isSavingValue}
                                style={compactGhostButtonStyle}
                              >
                                {isSavingValue ? "Eliminando..." : "Eliminar"}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <StateCard label="Todavia no hay valores generados para esta etiqueta." />
              )}
            </article>
          ))}
        </div>
      ) : (
        <StateCard label="No hay etiquetas en este grupo." />
      )}
    </section>
  );
}

function AdminCategoriesManager({
  onCategoriesChange,
}: {
  onCategoriesChange?: () => Promise<void> | void;
}) {
  const { isTabletOrSmaller } = useViewportFlags();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState<Category | null>(null);

  useEffect(() => {
    const load = async () => {
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
    };
    void load();
  }, []);

  const create = async () => {
    try {
      setSaving(true);
      setError("");
      const payload = {
        name: name.trim(),
        imageUrl: imageUrl.trim() || undefined,
      };
      const created = editingCategoryId
        ? await api(`/categories/${editingCategoryId}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await api("/categories", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      setCategories((current) =>
        editingCategoryId
          ? current.map((category) =>
              category.id === editingCategoryId ? created : category,
            )
          : [created, ...current],
      );
      const wasEditing = editingCategoryId !== null;
      setName("");
      setImageUrl("");
      setEditingCategoryId(null);
      await onCategoriesChange?.();
      setSuccess(wasEditing ? "Categoria actualizada." : "Categoria creada.");
    } catch (err) {
      setError(
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
      await api(`/categories/${pendingRemoval.id}`, {
        method: "DELETE",
      });
      setCategories((current) =>
        current.filter((category) => category.id !== pendingRemoval.id),
      );
      if (editingCategoryId === pendingRemoval.id) {
        setEditingCategoryId(null);
        setName("");
        setImageUrl("");
      }
      await onCategoriesChange?.();
      setSuccess(`Categoria "${pendingRemoval.name}" eliminada.`);
      setPendingRemoval(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar la categoria.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{ ...twoColumnStyle, gridTemplateColumns: isTabletOrSmaller ? "minmax(0, 1fr)" : twoColumnStyle.gridTemplateColumns }}>
        <div style={blockStyle}>
          {editingCategoryId ? (
            <span style={metaStyle}>
              Editando categoria #{editingCategoryId}
            </span>
          ) : null}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de categoria"
            style={fieldStyle}
          />
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Ruta de imagen"
            style={fieldStyle}
          />
          <div style={rowWrapStyle}>
            <button
              type="button"
              onClick={create}
              disabled={saving || !name.trim()}
              style={primaryButtonStyle}
            >
              {saving
                ? "Guardando..."
                : editingCategoryId
                  ? "Guardar categoria"
                  : "Crear categoria"}
            </button>
            {editingCategoryId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingCategoryId(null);
                  setName("");
                  setImageUrl("");
                }}
                style={ghostButtonStyle}
              >
                Cancelar
              </button>
            ) : null}
          </div>
          {imageUrl ? (
            <div style={{ ...itemStyle, padding: 12 }}>
              <Image
                src={resolveAssetUrl(imageUrl) ?? imageUrl}
                alt="Vista previa de categoria"
                width={1200}
                height={640}
                unoptimized
                style={{
                  width: "100%",
                  height: 160,
                  objectFit: "cover",
                  borderRadius: 18,
                }}
              />
            </div>
          ) : null}
          <span style={metaStyle}>
            Ejemplo: /images/seed-categories/remeras.svg
          </span>
          {error ? <p style={errorStyle}>{error}</p> : null}
          {success ? <p style={successStyle}>{success}</p> : null}
        </div>
        <div style={blockStyle}>
          {loading ? (
            <StateCard label="Cargando categorias..." />
          ) : (
            categories.map((category) => (
              <div key={category.id} style={itemStyle}>
                {category.imageUrl ? (
                  <Image
                    src={
                      resolveAssetUrl(category.imageUrl) ?? category.imageUrl
                    }
                    alt={category.name}
                    width={1200}
                    height={720}
                    unoptimized
                    style={{
                      width: "100%",
                      height: 120,
                      objectFit: "cover",
                      borderRadius: 18,
                    }}
                  />
                ) : null}
                <strong style={{ color: "#111" }}>{category.name}</strong>
                <span style={{ ...metaStyle, color: "#111" }}>/{category.slug}</span>
                <span style={{ ...metaStyle, color: "#111" }}>
                  {category.imageUrl || "Sin imagen cargada"}
                </span>
                <div style={rowWrapStyle}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategoryId(category.id);
                      setName(category.name);
                      setImageUrl(category.imageUrl ?? "");
                    }}
                    style={ghostButtonStyle}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingRemoval(category)}
                    style={ghostButtonStyle}
                    disabled={saving}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
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
                {`Eliminar categoria "${pendingRemoval.name}"`}
              </strong>
              <p style={copyStyle}>
                {Number(pendingRemoval.productsCount ?? 0) > 0
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
                onClick={() => void removeCategory()}
                style={primaryButtonStyle}
                disabled={saving}
              >
                {saving ? "Eliminando..." : "Confirmar eliminacion"}
              </button>
            </div>
          </section>
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
                    {units} unidad{units === 1 ? "" : "es"} ·{" "}
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
              {order.items.length} item{order.items.length === 1 ? "" : "s"} â€¢{" "}
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
                            {row.ordersCount} pedidos · Promedio {money(row.averageTicket)}
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
  title,
  copy,
  actions,
}: {
  title: string;
  copy?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div style={{ ...betweenStyle, minWidth: 0, width: "100%" }}>
      <div style={{ minWidth: 0, maxWidth: "100%" }}>
        <p style={eyebrowStyle}>Gestion</p>
        <h2 style={title2Style}>{title}</h2>
      </div>
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
        {copy ? (
          <p
            style={{
              ...copyStyle,
              width: "100%",
              maxWidth: "100%",
              textAlign: "right",
              overflowWrap: "anywhere",
            }}
          >
            {copy}
          </p>
        ) : null}
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
    setDragging(false);
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
          onPointerUp={stopDragging}
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
          <div style={betweenStyle}>
            <div style={{ display: "grid", gap: 4 }}>
              <strong style={{ color: "var(--account-text-strong)" }}>{label}</strong>
              <span style={metaStyle}>{secondaryText}</span>
            </div>
            <span style={imageOrderBadgeStyle}>{orderLabel}</span>
          </div>
          <div style={rowWrapStyle}>
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              style={ghostButtonStyle}
            >
              Subir
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              style={ghostButtonStyle}
            >
              Bajar
            </button>
          </div>
        </div>
        <span style={metaStyle}>
          Arrastra desde cualquier punto de la imagen para moverla. Usa el
          control de zoom o la rueda del mouse para acercar y alejar.
        </span>

        <label style={imageZoomControlStyle}>
          <span style={metaStyle}>Zoom {Math.round(value.zoom * 100)}%</span>
          <input
            type="range"
            min={1}
            max={2.5}
            step={0.01}
            value={value.zoom}
            onChange={(event) =>
              onChange({ zoom: clampImageZoom(Number(event.target.value)) })
            }
            style={imageZoomSliderStyle}
          />
        </label>

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
const imageZoomControlStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
};
const imageZoomSliderStyle: React.CSSProperties = {
  width: "100%",
  accentColor: "var(--account-text-strong)",
};
const imageOrderBadgeStyle: React.CSSProperties = {
  width: "fit-content",
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid var(--checkout-border)",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-muted)",
  fontSize: 12,
};
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
const metricCardButtonStyle: React.CSSProperties = {
  appearance: "none",
  background: "transparent",
  border: "none",
  padding: 0,
  margin: 0,
  textAlign: "inherit",
  cursor: "pointer",
  borderRadius: 24,
  overflow: "hidden",
  display: "block",
};
const metaStyle: React.CSSProperties = {
  color: "var(--account-text-soft)",
  fontSize: 13,
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
const title2Style: React.CSSProperties = {
  margin: "10px 0 0",
  fontSize: "clamp(1.8rem,2vw,2.6rem)",
  letterSpacing: "-0.05em",
};
const title3Style: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: 22,
  color: "var(--account-text-strong)",
};
const checkStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "var(--account-text-strong)",
};
const errorStyle: React.CSSProperties = { margin: 0, color: "#ff9f9f" };
const successStyle: React.CSSProperties = { margin: 0, color: "#b8f5c2" };
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
const publishToggleCellStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  color: "var(--account-text-strong)",
};
const valueItemStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateRows: "minmax(0, 1fr) auto",
  alignContent: "space-between",
  gap: 12,
  borderRadius: 18,
  border: "1px solid var(--checkout-border)",
  background: "var(--page-panel-strong-bg)",
  padding: 14,
  minHeight: 132,
  maxHeight: 148,
  overflow: "hidden",
};
const valueActionsRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
  alignSelf: "end",
  marginTop: "auto",
};
const compactActionButtonStyle: React.CSSProperties = {
  ...secondaryButtonStyle,
  width: "100%",
  padding: "9px 12px",
  borderRadius: 14,
};
const compactGhostButtonStyle: React.CSSProperties = {
  ...ghostButtonStyle,
  width: "100%",
  padding: "9px 12px",
  borderRadius: 14,
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
});
const removeChipStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid var(--admin-danger-border)",
  background: "var(--admin-danger-bg)",
  color: "var(--admin-danger-color)",
  cursor: "pointer",
};
