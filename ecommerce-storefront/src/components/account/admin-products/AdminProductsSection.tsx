"use client";

import Image from "next/image";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, apiBlob } from "@/lib/api";
import { getGoogleApiKey, getGoogleClientId } from "@/lib/runtime-config";
import { resolveAssetUrl } from "@/lib/asset-url";
import { getClientStoreContext, getClientStoreId } from "@/lib/tenant/store-context";
import {
  clampImageOffset,
  clampImageZoom,
  getCatalogImageTransform,
} from "@/lib/product-image-layout";
import { money } from "../order-utils";



export type Product = {
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
    sku?: string | null;
    Size?: string | null;
    Color?: string | null;
    waistSize?: string | null;
    price?: number | string | null;
    inventories?: Array<{ quantity?: number | null }>;
  }>;
  categories?: Array<{ category: { id: number; name: string } }>;
  optionValues?: Array<{ value?: string; productOptionId?: number }>;
};

type ProductPriceInputSettings = {
  enabled: boolean;
  discountPercentage: number;
  multiplier: number;
};

const defaultPriceInputSettings: ProductPriceInputSettings = {
  enabled: false,
  discountPercentage: 0,
  multiplier: 1,
};

type AdminIntegrationsConfig = {
  priceInput?: Partial<ProductPriceInputSettings> | null;
};

type ProductCatalogMetrics = {
  total: number;
  published: number;
  draft: number;
  withoutStock: number;
};

type ProductCatalogResponse = {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  metrics: ProductCatalogMetrics;
};

export type Category = {
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
  waistSize: string;
  inventoryQuantity: string;
  weight: string;
  width: string;
  height: string;
  length: string;
};

type ProductWizardStep =
  | "info"
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

type DrivePickerDocument = {
  id?: string;
  mimeType?: string;
  name?: string;
  sizeBytes?: number | string;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
};

type GoogleTokenError = {
  type?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (options?: { login_hint?: string; prompt?: string }) => void;
};

type GooglePickerResponse = {
  action?: string;
  docs?: DrivePickerDocument[];
};

type GoogleApisWindow = Window & {
  gapi?: {
    load: (api: string, callback: () => void) => void;
  };
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient: (options: {
          client_id: string;
          scope: string;
          login_hint?: string;
          prompt?: string;
          callback: (response: GoogleTokenResponse) => void;
          error_callback?: (error: GoogleTokenError) => void;
        }) => GoogleTokenClient;
      };
    };
    picker?: {
      Action: { CANCEL: string; PICKED: string };
      DocsView: new (viewId: string) => {
        setIncludeFolders: (includeFolders: boolean) => unknown;
        setMode?: (mode: string) => unknown;
        setMimeTypes: (mimeTypes: string) => unknown;
        setSelectFolderEnabled: (enabled: boolean) => unknown;
      };
      Feature: { MULTISELECT_ENABLED: string };
      PickerBuilder: new () => {
        addView: (view: unknown) => unknown;
        enableFeature: (feature: string) => unknown;
        setCallback: (callback: (response: GooglePickerResponse) => void) => unknown;
        setAppId: (appId: string) => unknown;
        setDeveloperKey: (developerKey: string) => unknown;
        setMaxItems?: (maxItems: number) => unknown;
        setOrigin?: (origin: string) => unknown;
        setSelectableMimeTypes?: (mimeTypes: string) => unknown;
        setOAuthToken: (token: string) => unknown;
        build: () => { setVisible: (visible: boolean) => void };
      };
      DocsViewMode?: { GRID: string; LIST: string };
      ViewId: { DOCS: string; DOCS_IMAGES?: string };
    };
  };
};

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
  "ready_for_pickup",
  "picked_up",
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
  waistSize: "",
  inventoryQuantity: "",
  weight: "",
  width: "",
  height: "",
  length: "",
});

const productWizardSteps: Array<{ id: ProductWizardStep; label: string }> = [
  { id: "info", label: "Info y logistica" },
  { id: "images", label: "Imagenes" },
  { id: "labels", label: "Atributos" },
  { id: "variants", label: "Variantes" },
  { id: "publish", label: "Publicacion" },
];
const ADMIN_PRODUCTS_SHOW_LIST_EVENT = "admin-products:show-list";

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
const ADMIN_PRODUCTS_PAGE_SIZE = 80;
const GOOGLE_DRIVE_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/bmp",
  "image/x-ms-bmp",
  "image/tiff",
  "image/heic",
  "image/heif",
  "image/svg+xml",
].join(",");
const GOOGLE_DRIVE_AUTH_SCOPES = "openid email https://www.googleapis.com/auth/drive.file";
const GOOGLE_DRIVE_AUTH_TIMEOUT_MS = 45_000;
const GOOGLE_DRIVE_MAX_IMAGE_BYTES = 8 * 1024 * 1024;
let googleIdentityScriptPromise: Promise<void> | null = null;
let googlePickerScriptPromise: Promise<void> | null = null;

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

function loadExternalScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    );

    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar Google Drive.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("No se pudo cargar Google Drive."));
    document.head.appendChild(script);
  });
}

async function loadGoogleIdentityScript() {
  if (!googleIdentityScriptPromise) {
    googleIdentityScriptPromise = loadExternalScript("https://accounts.google.com/gsi/client");
  }

  return googleIdentityScriptPromise;
}

async function loadGooglePickerScript() {
  if (!googlePickerScriptPromise) {
    googlePickerScriptPromise = loadExternalScript("https://apis.google.com/js/api.js").then(
      () =>
        new Promise<void>((resolve, reject) => {
          const googleWindow = window as GoogleApisWindow;
          if (!googleWindow.gapi?.load) {
            reject(new Error("No se pudo iniciar Google Picker."));
            return;
          }
          googleWindow.gapi.load("picker", resolve);
        }),
    );
  }

  return googlePickerScriptPromise;
}

function getDriveAccountStorageKey() {
  const { host, storeId } = getClientStoreContext();
  return `admin-products:drive-account:${storeId}:${host}`;
}

function readStoredDriveAccountEmail() {
  try {
    return window.localStorage.getItem(getDriveAccountStorageKey()) ?? "";
  } catch {
    return "";
  }
}

function writeStoredDriveAccountEmail(email: string) {
  try {
    window.localStorage.setItem(getDriveAccountStorageKey(), email);
  } catch {
    // Local storage can be unavailable in private or restricted browsers.
  }
}

function getGoogleDriveAppId(clientId: string) {
  const [projectNumber] = clientId.split("-");
  return /^\d+$/.test(projectNumber ?? "") ? projectNumber : "";
}

async function fetchGoogleDriveAccountEmail(accessToken: string) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return "";
  }

  const data = await response.json() as { email?: string };
  return data.email?.trim() ?? "";
}

function requestGoogleDriveAccessToken(
  clientId: string,
  loginHint?: string,
  forceAccountSelection = false,
) {
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new Error("Se cancelo la seleccion de cuenta de Google."));
    }, GOOGLE_DRIVE_AUTH_TIMEOUT_MS);

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeoutId);
      callback();
    };

    const googleWindow = window as GoogleApisWindow;
    const tokenClient = googleWindow.google?.accounts?.oauth2?.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_DRIVE_AUTH_SCOPES,
      ...(loginHint && !forceAccountSelection ? { login_hint: loginHint } : {}),
      prompt: forceAccountSelection ? "select_account" : "",
      callback: (response) => {
        const accessToken = response.access_token;
        if (response.error || !accessToken) {
          finish(() => reject(new Error("Google no autorizo el acceso a Drive.")));
          return;
        }
        finish(() => resolve(accessToken));
      },
      error_callback: (error) => {
        const message =
          error.type === "popup_closed"
            ? "Se cancelo la seleccion de cuenta de Google."
            : "Google no autorizo el acceso a Drive.";
        finish(() => reject(new Error(message)));
      },
    });

    if (!tokenClient) {
      finish(() => reject(new Error("Google Drive no esta disponible en este navegador.")));
      return;
    }

    tokenClient.requestAccessToken({
      prompt: forceAccountSelection ? "select_account" : "",
      ...(loginHint && !forceAccountSelection ? { login_hint: loginHint } : {}),
    });
  });
}

function openGoogleDrivePicker(apiKey: string, accessToken: string, appId: string, maxItems: number) {
  return new Promise<DrivePickerDocument[]>((resolve) => {
    const googleWindow = window as GoogleApisWindow;
    const pickerApi = googleWindow.google?.picker;

    if (!pickerApi) {
      resolve([]);
      return;
    }

    const view = new pickerApi.DocsView(pickerApi.ViewId.DOCS);
    view.setIncludeFolders(false);
    view.setSelectFolderEnabled(false);
    view.setMimeTypes(GOOGLE_DRIVE_IMAGE_MIME_TYPES);
    if (pickerApi.DocsViewMode?.GRID) {
      view.setMode?.(pickerApi.DocsViewMode.GRID);
    }

    const picker = new pickerApi.PickerBuilder();
    picker.setAppId(appId);
    picker.setDeveloperKey(apiKey);
    picker.setOAuthToken(accessToken);
    picker.setMaxItems?.(maxItems);
    picker.setOrigin?.(window.location.origin);
    picker.setSelectableMimeTypes?.(GOOGLE_DRIVE_IMAGE_MIME_TYPES);
    picker.addView(view);
    picker.enableFeature(pickerApi.Feature.MULTISELECT_ENABLED);
    picker.setCallback((response) => {
      if (response.action === pickerApi.Action.PICKED) {
        resolve(response.docs ?? []);
        return;
      }
      if (response.action === pickerApi.Action.CANCEL) {
        resolve([]);
      }
    });
    picker.build().setVisible(true);
  });
}

function getDriveDocumentSizeBytes(document: DrivePickerDocument) {
  const parsed = Number(document.sizeBytes ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatMegabytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function scopeCategoriesToActiveStore(items: Category[]) {
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

type ProductAdminTab =
  | "catalog"
  | "create"
  | "options"
  | "variant-options"
  | "categories";
type ProductSortKey = "product" | "category" | "variants" | "stock" | "status" | "price" | "images";
type SortDirection = "asc" | "desc";

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

function getProductTotalStock(product: Product) {
  return (product.variants ?? []).reduce(
    (sum, variant) =>
      sum + Number(variant.inventories?.[0]?.quantity ?? 0),
    0,
  );
}

function resolveDisplayPriceFromBase(
  price: string | number | null | undefined,
  priceInputSettings: ProductPriceInputSettings,
) {
  const parsed = Number(price ?? 0);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  if (!priceInputSettings.enabled || priceInputSettings.multiplier <= 0) {
    return parsed;
  }

  return Number((parsed * priceInputSettings.multiplier).toFixed(2));
}

function roundToNearestHundred(value: number) {
  return Math.max(0, Math.round(value / 100) * 100);
}

function resolveCatalogPriceFromBase(
  price: string | number | null | undefined,
  priceInputSettings: ProductPriceInputSettings,
) {
  const displayPrice = resolveDisplayPriceFromBase(price, priceInputSettings);
  if (!displayPrice) return 0;

  return priceInputSettings.enabled ? roundToNearestHundred(displayPrice) : displayPrice;
}

function formatEditablePriceFromBase(
  price: string | number | null | undefined,
  priceInputSettings: ProductPriceInputSettings,
) {
  const displayPrice = resolveDisplayPriceFromBase(price, priceInputSettings);
  if (!displayPrice) return "";

  return Number.isInteger(displayPrice)
    ? String(displayPrice)
    : displayPrice.toFixed(2).replace(/\.?0+$/, "");
}

function normalizePriceInputSettings(input: unknown): ProductPriceInputSettings {
  if (!input || typeof input !== "object") return defaultPriceInputSettings;
  const source = input as Partial<ProductPriceInputSettings>;
  const multiplier = Number(source.multiplier ?? 1);
  const discountPercentage = Number(source.discountPercentage ?? 0);

  return {
    enabled: Boolean(source.enabled) && Number.isFinite(multiplier) && multiplier > 0,
    discountPercentage: Number.isFinite(discountPercentage) ? discountPercentage : 0,
    multiplier: Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1,
  };
}

function getProductPriceFrom(
  product: Product,
  priceInputSettings = defaultPriceInputSettings,
) {
  const prices = (product.variants ?? [])
    .map((variant) => resolveCatalogPriceFromBase(variant.price, priceInputSettings))
    .filter((price) => Number.isFinite(price) && price > 0);

  return prices.length > 0 ? Math.min(...prices) : 0;
}

function getProductCatalogStatus(product: Product) {
  if (getProductTotalStock(product) <= 0) return "Sin stock";
  return product.published ? "Publicado" : "Inventario";
}

function getProductCategoryNames(product: Product) {
  return (product.categories ?? []).map((entry) => entry.category.name);
}

function productSortValue(
  product: Product,
  key: ProductSortKey,
  priceInputSettings: ProductPriceInputSettings,
) {
  switch (key) {
    case "category":
      return getProductCategoryNames(product).join(", ");
    case "variants":
      return product.variants?.length ?? 0;
    case "stock":
      return getProductTotalStock(product);
    case "status":
      return getProductCatalogStatus(product);
    case "price":
      return getProductPriceFrom(product, priceInputSettings);
    case "images":
      return product.images?.length ?? 0;
    case "product":
    default:
      return product.title;
  }
}

function SortableProductTh({
  children,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  children: React.ReactNode;
  sortKey: ProductSortKey;
  activeKey: ProductSortKey;
  direction: SortDirection;
  onSort: (key: ProductSortKey) => void;
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

function variantCombinationKey(variant: Pick<EditableVariant, "Color" | "Size" | "waistSize">) {
  return [
    normalizeComparableName(variant.Color),
    normalizeComparableName(variant.Size),
    normalizeComparableName(variant.waistSize),
  ].join("|");
}

const variantOptionDefinitions: Array<{
  kind: "color" | "size";
  name: string;
  label: string;
  description: string;
  attributeType: ProductOption["attributeType"];
}> = [
  {
    kind: "color",
    name: "Color",
    label: "Colores",
    description: "Opciones que aparecen en el desplegable Color de cada variante.",
    attributeType: "color",
  },
  {
    kind: "size",
    name: "Talle",
    label: "Talles",
    description: "Opciones que aparecen en el desplegable Talle normal.",
    attributeType: "text",
  },
];
const variantSystemOptionKinds: Array<"color" | "size" | "waistSize"> = ["color", "size", "waistSize"];

function isVariantAttributeOption(option: Pick<ProductOption, "name">, kind: "color" | "size" | "waistSize") {
  const normalized = normalizeComparableName(option.name);
  const aliases = {
    color: ["color", "colores"],
    size: ["talle", "talles", "size", "sizes"],
    waistSize: ["talle cintura", "talles cintura", "cintura", "waist", "waist size"],
  };

  return aliases[kind].includes(normalized);
}

function isVariantConfigOption(option: Pick<ProductOption, "name">) {
  return variantSystemOptionKinds.some((kind) => isVariantAttributeOption(option, kind));
}

function reusableValuesForOption(option?: ProductOption) {
  return option?.reusableValues?.map((value) => value.value.trim()).filter(Boolean) ?? [];
}

function mergeSuggestionValues(...groups: string[][]) {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const group of groups) {
    for (const value of group) {
      const normalizedValue = value.trim();
      if (!normalizedValue) continue;
      const key = normalizeComparableName(normalizedValue);
      if (seen.has(key)) continue;
      seen.add(key);
      values.push(normalizedValue);
    }
  }

  return values;
}

function attributeSaveErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message.toLowerCase().includes("product option already exists")) {
    return "Ya existe un atributo con ese nombre. Usá el existente o elegí otro nombre.";
  }

  return message || "No se pudo guardar el atributo.";
}

export default function AdminProductsSection({
  initialTab = "catalog",
  userRole,
}: {
  initialTab?: ProductAdminTab;
  userRole?: string | null;
}) {
  const { isTabletOrSmaller, isPhone } = useViewportFlags();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formTopRef = useRef<HTMLDivElement | null>(null);
  const catalogAutoReloadAttemptedRef = useRef(false);
  const catalogBaseLoadedRef = useRef(false);
  const canManageCatalog = userRole !== "STAFF";
  const [products, setProducts] = useState<Product[]>([]);
  const [productPage, setProductPage] = useState(1);
  const [productTotal, setProductTotal] = useState(0);
  const [productTotalPages, setProductTotalPages] = useState(1);
  const [productMetrics, setProductMetrics] = useState<ProductCatalogMetrics>({
    total: 0,
    published: 0,
    draft: 0,
    withoutStock: 0,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [priceInputSettings, setPriceInputSettings] = useState<ProductPriceInputSettings>(
    defaultPriceInputSettings,
  );
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
  const [productSortKey, setProductSortKey] = useState<ProductSortKey>("product");
  const [productSortDirection, setProductSortDirection] = useState<SortDirection>("asc");
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
  const [pendingLabelPrintPrompt, setPendingLabelPrintPrompt] = useState<{
    productId: number;
    productTitle: string;
  } | null>(null);
  const [confirmContinueWithoutVariants, setConfirmContinueWithoutVariants] = useState(false);
  const [printingLabelProductId, setPrintingLabelProductId] = useState<number | null>(null);
  const [publishingProductId, setPublishingProductId] = useState<number | null>(null);
  const [regenerateSkusOnNextSave, setRegenerateSkusOnNextSave] = useState(false);
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
    waistSize: "",
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
  const [importingDriveImages, setImportingDriveImages] = useState(false);
  const [driveAccountEmail, setDriveAccountEmail] = useState("");
  const [imageGridLines, setImageGridLines] = useState(5);
  const [selectedOptionValues, setSelectedOptionValues] = useState<
    Record<number, string[]>
  >({});
  const [selectedVariantAttributeIds, setSelectedVariantAttributeIds] = useState<number[]>([]);
  const [openOptionId, setOpenOptionId] = useState<number | null>(null);
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
  const variantPricePlaceholder = priceInputSettings.enabled
    ? "Precio efectivo/transferencia"
    : "Precio base";

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    setActiveTab(!canManageCatalog && ["create", "options", "variant-options"].includes(initialTab) ? "catalog" : initialTab);
  }, [canManageCatalog, initialTab]);

  const loadOptions = async () => {
    const optionsData = await api("/product-options");
    const nextOptions = Array.isArray(optionsData) ? optionsData : [];
    setOptions(nextOptions);
    return nextOptions;
  };

  const buildCatalogQueryString = (page = productPage) => {
    const params = new URLSearchParams();
    const query = productQuery.trim();

    params.set("page", String(page));
    params.set("pageSize", String(ADMIN_PRODUCTS_PAGE_SIZE));
    params.set("includeMetrics", page === 1 ? "true" : "false");

    if (query) {
      params.set("search", query);
    }

    if (productCategoryFilter !== "all") {
      params.set("categoryId", productCategoryFilter);
    }

    if (productStatusFilter !== "all") {
      params.set("status", productStatusFilter);
    }

    return params.toString();
  };

  const fetchAdminProduct = async (productId: number) =>
    (await api(`/products/admin/${productId}`)) as Product;

  const loadData = async (page = productPage): Promise<Product[]> => {
    setLoading(true);
    try {
      const shouldLoadBase = !catalogBaseLoadedRef.current;
      const [p, c, o, integrations] = await Promise.all([
        api(`/products/admin/catalog?${buildCatalogQueryString(page)}`),
        shouldLoadBase ? api("/categories") : Promise.resolve(categories),
        shouldLoadBase ? api("/product-options") : Promise.resolve(options),
        shouldLoadBase
          ? api("/store/admin/integrations") as Promise<AdminIntegrationsConfig>
          : Promise.resolve({ priceInput: priceInputSettings }),
      ]);
      const catalog = p as Partial<ProductCatalogResponse>;
      const nextProducts = Array.isArray(catalog.items) ? catalog.items : [];
      setProducts(nextProducts);
      setProductPage(Number(catalog.page ?? page));
      setProductTotal(Number(catalog.total ?? nextProducts.length));
      setProductTotalPages(Math.max(1, Number(catalog.totalPages ?? 1)));
      if (catalog.metrics) {
        setProductMetrics({
          total: Number(catalog.metrics.total ?? nextProducts.length),
          published: Number(catalog.metrics.published ?? 0),
          draft: Number(catalog.metrics.draft ?? 0),
          withoutStock: Number(catalog.metrics.withoutStock ?? 0),
        });
      }
      setCategories(Array.isArray(c) ? scopeCategoriesToActiveStore(c as Category[]) : []);
      setOptions(Array.isArray(o) ? o : []);
      setPriceInputSettings(normalizePriceInputSettings(integrations?.priceInput));
      catalogBaseLoadedRef.current = true;
      setError("");
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
    const timeout = window.setTimeout(() => {
      void loadData(productPage);
    }, productQuery.trim() ? 280 : 0);

    return () => window.clearTimeout(timeout);
  }, [productCategoryFilter, productPage, productQuery, productStatusFilter]);

  useEffect(() => {
    if (activeTab !== "catalog") {
      catalogAutoReloadAttemptedRef.current = false;
      return;
    }

    if (loading || products.length > 0 || catalogAutoReloadAttemptedRef.current) {
      return;
    }

    catalogAutoReloadAttemptedRef.current = true;
    void loadData();
  }, [activeTab, loading, products.length]);

  useEffect(() => {
    const reloadEmptyCatalogOnFocus = () => {
      if (document.visibilityState !== "visible") return;
      if (activeTab !== "catalog" || loading || products.length > 0) return;
      void loadData();
    };

    window.addEventListener("focus", reloadEmptyCatalogOnFocus);
    document.addEventListener("visibilitychange", reloadEmptyCatalogOnFocus);
    return () => {
      window.removeEventListener("focus", reloadEmptyCatalogOnFocus);
      document.removeEventListener("visibilitychange", reloadEmptyCatalogOnFocus);
    };
  }, [activeTab, loading, products.length]);

  useEffect(() => {
    uploadImagesRef.current = imageFiles;
  }, [imageFiles]);

  useEffect(() => {
    setDriveAccountEmail(readStoredDriveAccountEmail());
  }, []);

  useEffect(() => {
    return () => {
      revokeUploadImages(uploadImagesRef.current);
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!canManageCatalog) {
      setAutoOpenedProductId(null);
      return;
    }

    if (searchParams.get("section") === "admin-labels") {
      setAutoOpenedProductId(null);
      return;
    }

    const rawProductId = searchParams.get("productId");
    const nextProductId = rawProductId ? Number(rawProductId) : NaN;

    if (!Number.isFinite(nextProductId) || nextProductId <= 0) {
      setAutoOpenedProductId(null);
      return;
    }

    if (loading || autoOpenedProductId === nextProductId) {
      return;
    }

    const productToEdit = products.find((product) => product.id === nextProductId);

    const openProduct = async () => {
      try {
        const product = productToEdit ?? (await fetchAdminProduct(nextProductId));
        setActiveTab("create");
        formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        setAutoOpenedProductId(nextProductId);
        await hydrateFormFromProduct(product);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo abrir el producto solicitado.",
        );
      }
    };

    void openProduct();
  }, [autoOpenedProductId, canManageCatalog, loading, products, searchParams]);

  const filteredProducts = useMemo(() => {
    return products;
  }, [products]);
  const sortedProducts = useMemo(() => {
    const direction = productSortDirection === "asc" ? 1 : -1;

    return [...filteredProducts].sort((a, b) => {
      const left = productSortValue(a, productSortKey, priceInputSettings);
      const right = productSortValue(b, productSortKey, priceInputSettings);

      if (typeof left === "number" && typeof right === "number") {
        return (left - right) * direction;
      }

      return String(left).localeCompare(String(right), "es", { numeric: true }) * direction;
    });
  }, [filteredProducts, priceInputSettings, productSortDirection, productSortKey]);

  const changeProductSort = (nextKey: ProductSortKey) => {
    if (productSortKey === nextKey) {
      setProductSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setProductSortKey(nextKey);
    setProductSortDirection(["stock", "variants", "price", "images"].includes(nextKey) ? "desc" : "asc");
  };

  const filteredOptions = useMemo(() => {
    const query = optionQuery.trim().toLowerCase();
    const attributeOptions = options.filter((option) => !isVariantConfigOption(option));

    if (!query) {
      return attributeOptions;
    }

    return attributeOptions.filter((option) => {
      const valuesText = (option.reusableValues ?? [])
        .map((value) => value.value)
        .join(" ")
        .toLowerCase();

      return (
        option.name.toLowerCase().includes(query) || valuesText.includes(query)
      );
    });
  }, [optionQuery, options]);

  const variantConfigOptions = useMemo(
    () =>
      variantOptionDefinitions.map((definition) => ({
        definition,
        option: options.find((option) => isVariantAttributeOption(option, definition.kind)),
      })),
    [options],
  );

  const variantAutocomplete = useMemo(() => {
    const collect = (selector: (variant: EditableVariant) => string) => [
      ...new Set(
        variants.map((variant) => selector(variant).trim()).filter(Boolean),
      ),
    ];
    const colorOption = options.find((option) => isVariantAttributeOption(option, "color"));
    const sizeOption = options.find((option) => isVariantAttributeOption(option, "size"));
    const waistSizeOption = options.find((option) => isVariantAttributeOption(option, "waistSize"));

    return {
      sku: collect((variant) => variant.sku),
      price: collect((variant) => variant.price),
      size: mergeSuggestionValues(reusableValuesForOption(sizeOption), collect((variant) => variant.Size)),
      color: mergeSuggestionValues(reusableValuesForOption(colorOption), collect((variant) => variant.Color)),
      waistSize: mergeSuggestionValues(reusableValuesForOption(waistSizeOption), collect((variant) => variant.waistSize)),
      inventoryQuantity: collect((variant) => variant.inventoryQuantity),
      weight: collect((variant) => variant.weight),
      width: collect((variant) => variant.width),
      height: collect((variant) => variant.height),
      length: collect((variant) => variant.length),
    };
  }, [options, variants]);

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
    setOpenOptionId(null);
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
    setBulkVariantPatch({ price: "", stock: "", color: "", size: "", waistSize: "" });
    setImageUploadProgress(null);
    setAttributeDraft(null);
    setRegenerateSkusOnNextSave(false);
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
    if (!canManageCatalog) return;
    resetForm();
    setActiveTab("create");
    setWizardStep("info");
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const exitProductWizard = () => {
    resetForm();
    setActiveTab("catalog");
  };

  useEffect(() => {
    const showProductList = () => {
      resetForm();
      setAutoOpenedProductId(null);
      setPendingLabelPrintPrompt(null);
      setActiveTab("catalog");
    };

    window.addEventListener(ADMIN_PRODUCTS_SHOW_LIST_EVENT, showProductList);
    return () => {
      window.removeEventListener(ADMIN_PRODUCTS_SHOW_LIST_EVENT, showProductList);
    };
  }, [imageFiles]);

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
        setSelectedVariantAttributeIds((attributeIds) => attributeIds.filter((id) => id !== optionId));
        return clone;
      }
      setSelectedVariantAttributeIds((attributeIds) =>
        attributeIds.includes(optionId) ? attributeIds : [...attributeIds, optionId],
      );
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
    waistSize: variant.waistSize.trim(),
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
      normalized.waistSize,
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
        normalizedDraft.waistSize !== normalizedInitial.waistSize ||
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

  const buildProductSkuPrefix = (productTitle: string) => {
    const words = productTitle
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^A-Z0-9]+/u)
      .filter(Boolean);
    const acronym = words.map((word) => word[0]).join("");
    const compactTitle = words.join("");
    return (acronym + compactTitle).replace(/[^A-Z0-9]/g, "").slice(0, 3).padEnd(3, "X");
  };

  const variantIndexCode = (index: number) => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const first = alphabet[index % alphabet.length] ?? "A";
    const cycle = Math.floor(index / alphabet.length);
    return cycle > 0 ? `${first}${cycle + 1}` : first;
  };

  const buildAutomaticSkuCandidate = (
    productTitle: string,
    index: number,
    sequence: number,
  ) => {
    const prefix = buildProductSkuPrefix(productTitle);
    const variantCode = variantIndexCode(index);
    return `${prefix}${String(sequence).padStart(3, "0")}${variantCode}`;
  };

  const buildAutomaticSku = (
    productTitle: string,
    variant: EditableVariant,
    index: number,
    usedSkus: Set<string>,
  ) => {
    let sequence = Math.max(products.length + 1, 1);
    let candidate = buildAutomaticSkuCandidate(productTitle, index, sequence);
    while (usedSkus.has(candidate.toLowerCase())) {
      sequence += 1;
      candidate = buildAutomaticSkuCandidate(productTitle, index, sequence);
    }
    usedSkus.add(candidate.toLowerCase());
    return candidate;
  };

  const collectExistingSkuKeys = (variantsToUpdate: EditableVariant[]) => {
    const currentVariantIds = new Set(
      variantsToUpdate
        .map((variant) => variant.id)
        .filter((id): id is number => typeof id === "number"),
    );

    return new Set(
      products.flatMap((product) =>
        (product.variants ?? [])
          .filter((variant) => !currentVariantIds.has(variant.id))
          .map((variant) => String(variant.sku ?? "").trim().toLowerCase())
          .filter(Boolean),
      ),
    );
  };

  const checkUnavailableSkuKeys = async (
    candidates: Array<{ sku: string; excludeVariantId?: number }>,
  ) => {
    const uniqueCandidates = [
      ...new Map(
        candidates
          .filter((candidate) => candidate.sku.trim())
          .map((candidate) => [
            `${candidate.sku.trim().toLowerCase()}:${candidate.excludeVariantId ?? ""}`,
            {
              sku: candidate.sku.trim(),
              excludeVariantId: candidate.excludeVariantId,
            },
          ]),
      ).values(),
    ];

    if (uniqueCandidates.length === 0) {
      return new Set<string>();
    }

    const response = await api("/products/admin/skus/check", {
      method: "POST",
      body: JSON.stringify({ candidates: uniqueCandidates }),
    }) as { unavailableSkus?: string[] };

    return new Set(
      (response.unavailableSkus ?? [])
        .map((sku) => sku.trim().toLowerCase())
        .filter(Boolean),
    );
  };

  const generateAutomaticSkusLocallyForTitle = (
    productTitle: string,
    variantsToUpdate: EditableVariant[],
  ) => {
    const usedSkus = collectExistingSkuKeys(variantsToUpdate);
    return variantsToUpdate.map((variant, index) => ({
      ...variant,
      sku: buildAutomaticSku(productTitle, variant, index, usedSkus),
    }));
  };

  const generateAutomaticSkusForTitle = async (
    productTitle: string,
    variantsToUpdate: EditableVariant[],
  ) => {
    const usedSkus = collectExistingSkuKeys(variantsToUpdate);
    let generated = variantsToUpdate.map((variant, index) => ({
      ...variant,
      sku: buildAutomaticSku(productTitle, variant, index, usedSkus),
    }));

    for (let attempt = 0; attempt < 100; attempt += 1) {
      const unavailableSkuKeys = await checkUnavailableSkuKeys(
        generated.map((variant) => ({
          sku: variant.sku,
          excludeVariantId: variant.id,
        })),
      );

      if (unavailableSkuKeys.size === 0) {
        return generated;
      }

      generated = generated.map((variant, index) => {
        if (!unavailableSkuKeys.has(variant.sku.trim().toLowerCase())) {
          return variant;
        }

        usedSkus.add(variant.sku.trim().toLowerCase());
        return {
          ...variant,
          sku: buildAutomaticSku(productTitle, variant, index, usedSkus),
        };
      });
    }

    throw new Error("No pudimos generar SKU disponibles para las variantes.");
  };

  const generateAvailableAutomaticSku = async (
    productTitle: string,
    variant: EditableVariant,
    index: number,
    usedSkus: Set<string>,
    excludeVariantId?: number,
  ) => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const candidate = buildAutomaticSku(productTitle, variant, index, usedSkus);
      const unavailableSkuKeys = await checkUnavailableSkuKeys([
        { sku: candidate, excludeVariantId },
      ]);

      if (!unavailableSkuKeys.has(candidate.toLowerCase())) {
        return candidate;
      }

      usedSkus.add(candidate.toLowerCase());
    }

    throw new Error("No pudimos generar un SKU disponible para la variante.");
  };

  const generateAutomaticSkus = (variantsToUpdate: EditableVariant[]) =>
    generateAutomaticSkusForTitle(form.title.trim(), variantsToUpdate);

  const regenerateVisibleSkusForTitle = async (
    title: string,
    variantsToUpdate: EditableVariant[],
  ) => {
    try {
      const generated = await generateAutomaticSkusForTitle(title, variantsToUpdate);
      setVariants(generated);
    } catch (error) {
      setVariants(generateAutomaticSkusLocallyForTitle(title, variantsToUpdate));
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron validar los SKU contra la base.",
      );
    }
  };

  const handleProductTitleChange = (title: string) => {
    setForm((current) => ({ ...current, title }));
    if (variants.length > 0) {
      void regenerateVisibleSkusForTitle(title.trim(), variants);
    }
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

  const generateVariantsFromMatrix = async () => {
    const selectedAttributes = options.filter((option) =>
      selectedVariantAttributeIds.includes(option.id) && !isVariantConfigOption(option),
    );
    const selectedValuesByAttribute = selectedAttributes.map((option) => ({
      option,
      values: selectedOptionValues[option.id] ?? [],
    })).filter((entry) => entry.values.length > 0);

    const colorDraftValues = splitVariantValues(variantDraft.Color);
    const sizeDraftValues = splitVariantValues(variantDraft.Size);
    const waistDraftValues = splitVariantValues(variantDraft.waistSize);
    const baseWaistSize = variantDraft.waistSize.trim();
    const hasColorAttribute = false;
    const hasSizeAttribute = selectedValuesByAttribute.some((entry) =>
      ["talle", "talles", "size", "sizes"].includes(
        entry.option.name.trim().toLowerCase(),
      ),
    );
    const hasWaistAttribute = selectedValuesByAttribute.some((entry) =>
      ["talle cintura", "talles cintura", "cintura", "waist", "waist size"].includes(
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
      ...(!hasWaistAttribute && waistDraftValues.length > 0
        ? [{ option: { id: -3, name: "Talle cintura" }, values: waistDraftValues }]
        : []),
    ];

    if (matrixValues.length === 0) {
      if (parsePriceInput(variantDraft.price) <= 0) {
        showToast("Completa al menos el precio para crear una variante.");
        return;
      }

      const usedGeneratedSkus = collectExistingSkuKeys(variants);
      const nextVariant = {
        sku: "",
        price: variantDraft.price.trim(),
        Size: variantDraft.Size.trim(),
        Color: variantDraft.Color.trim(),
        waistSize: variantDraft.waistSize.trim(),
        inventoryQuantity: variantDraft.inventoryQuantity.trim() || "0",
        weight: variantDraft.weight.trim(),
        width: variantDraft.width.trim(),
        height: variantDraft.height.trim(),
        length: variantDraft.length.trim(),
      };
      const sku = await generateAvailableAutomaticSku(
        form.title.trim(),
        nextVariant,
        variants.length,
        usedGeneratedSkus,
      );
      const normalized = normalizeVariant({ ...nextVariant, sku });

      setVariants((current) => {
        const skuKey = normalized.sku.trim().toLowerCase();
        if (skuKey && current.some((variant) => variant.sku.trim().toLowerCase() === skuKey)) {
          showToast("Ya existe otra variante con ese SKU.");
          return current;
        }
        return [...current, normalized];
      });
      clearVariantDraft();
      return;
    }

    const basePrice = variantDraft.price.trim() || variants[0]?.price || "";
    const baseStock = variantDraft.inventoryQuantity.trim() || "0";
    const baseGarmentWidth = variantDraft.width.trim();
    const baseGarmentLength = variantDraft.length.trim();
    const combinations = matrixValues.reduce<string[][]>(
      (acc, entry) => acc.flatMap((combo) => entry.values.map((value) => [...combo, value])),
      [[]],
    );
    const usedGeneratedSkus = collectExistingSkuKeys(variants);
    variants
      .map((variant) => variant.sku.trim().toLowerCase())
      .filter(Boolean)
      .forEach((sku) => usedGeneratedSkus.add(sku));

    const generated = await Promise.all(combinations.map(async (combo, comboIndex) => {
        const colorIndex = matrixValues.findIndex((entry) => entry.option.name.trim().toLowerCase() === "color");
        const sizeIndex = matrixValues.findIndex((entry) => ["talle", "talles", "size", "sizes"].includes(entry.option.name.trim().toLowerCase()));
        const waistIndex = matrixValues.findIndex((entry) => ["talle cintura", "talles cintura", "cintura", "waist", "waist size"].includes(entry.option.name.trim().toLowerCase()));
        const nextVariant = {
          sku: "",
          price: basePrice,
          Size: sizeIndex >= 0 ? combo[sizeIndex] : "",
          Color: colorIndex >= 0 ? combo[colorIndex] : "",
          waistSize: waistIndex >= 0 ? combo[waistIndex] : baseWaistSize,
          inventoryQuantity: baseStock,
          weight: "",
          width: baseGarmentWidth,
          height: "",
          length: baseGarmentLength,
        };

        return {
          ...nextVariant,
          sku: await generateAvailableAutomaticSku(
            form.title.trim(),
            nextVariant,
            variants.length + comboIndex,
            usedGeneratedSkus,
          ),
        };
    }));

    setVariants((current) => {
      const existingCombinationKeys = new Set<string>();
      const dedupedCurrent = current.filter((variant) => {
        const key = variantCombinationKey(variant);
        if (existingCombinationKeys.has(key)) {
          return false;
        }
        existingCombinationKeys.add(key);
        return true;
      });
      const next = generated.filter((variant) => {
        const key = variantCombinationKey(variant);
        if (existingCombinationKeys.has(key)) {
          return false;
        }
        existingCombinationKeys.add(key);
        return true;
      });

      if (next.length === 0 && dedupedCurrent.length === current.length) {
        showToast("Esas variantes ya estan generadas.");
      } else if (dedupedCurrent.length < current.length) {
        showToast("Quite variantes duplicadas.");
      }

      return [...dedupedCurrent, ...next];
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
          waistSize: bulkVariantPatch.waistSize.trim() || variant.waistSize,
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

  const createVariantConfigOption = async (definition: (typeof variantOptionDefinitions)[number]) => {
    const alreadyExists = options.some((option) => isVariantAttributeOption(option, definition.kind));

    if (alreadyExists) {
      return;
    }

    try {
      setSavingOptionKey(`variant-option-${definition.kind}`);
      await api("/product-options", {
        method: "POST",
        body: JSON.stringify({
          name: definition.name,
          attributeType: definition.attributeType,
        }),
      });
      await loadOptions();
      setSuccess(`${definition.name} creado para variantes.`);
    } catch (err) {
      const message = attributeSaveErrorMessage(err);
      setError(message);
      showToast(message);
    } finally {
      setSavingOptionKey(null);
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

  const toggleProductPublication = async (product: Product) => {
    const nextPublished = !product.published;
    const removeFromCurrentList =
      (productStatusFilter === "published" && !nextPublished) ||
      (productStatusFilter === "draft" && nextPublished);
    const metricDelta = nextPublished ? 1 : -1;

    const applyMetricDelta = (direction: 1 | -1) => {
      setProductMetrics((current) => ({
        ...current,
        published: Math.max(0, current.published + metricDelta * direction),
        draft: Math.max(0, current.draft - metricDelta * direction),
      }));
    };

    try {
      setPublishingProductId(product.id);
      setError("");
      setProducts((current) =>
        removeFromCurrentList
          ? current.filter((item) => item.id !== product.id)
          : current.map((item) =>
              item.id === product.id ? { ...item, published: nextPublished } : item,
            ),
      );
      if (removeFromCurrentList) {
        setProductTotal((current) => Math.max(0, current - 1));
      }
      applyMetricDelta(1);
      if (editingProductId === product.id) {
        setForm((current) => ({ ...current, published: nextPublished }));
      }

      await api(`/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({ published: nextPublished }),
      });
      showToast(nextPublished ? "Producto publicado." : "Producto despublicado.");
    } catch (err) {
      setProducts((current) => {
        const hasCurrentProduct = current.some((item) => item.id === product.id);
        if (!hasCurrentProduct && removeFromCurrentList) {
          return [product, ...current];
        }

        return current.map((item) =>
          item.id === product.id ? { ...item, published: product.published } : item,
        );
      });
      if (removeFromCurrentList) {
        setProductTotal((current) => current + 1);
      }
      applyMetricDelta(-1);
      if (editingProductId === product.id) {
        setForm((current) => ({ ...current, published: product.published }));
      }
      showToast(
        err instanceof Error
          ? err.message
          : "No se pudo cambiar la publicacion del producto.",
      );
    } finally {
      setPublishingProductId(null);
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
      setSuccess("Variante eliminada del inventario actual.");
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
      if (!canManageCatalog) return;

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
        setRegenerateSkusOnNextSave(false);
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
              price: formatEditablePriceFromBase(
                variant.price,
                priceInputSettings,
              ),
              Size: String(variant.Size ?? ""),
              Color: String(variant.Color ?? ""),
              waistSize: String(variant.waistSize ?? ""),
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
    [canManageCatalog, clearVariantDraft, imageFiles, priceInputSettings],
  );

  const duplicateProductDraft = useCallback(
    async (product: Product) => {
      if (!canManageCatalog) return;

      setLoadingEditId(product.id);
      setError("");
      setSuccess("");

      try {
        const [productVariants, productOptionValues] = await Promise.all([
          api(`/variants/${product.id}`),
          api(`/products/${product.id}/option-values`),
        ]);

        setEditingProductId(null);
        setRegenerateSkusOnNextSave(true);
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
                price: formatEditablePriceFromBase(
                  variant.price,
                  priceInputSettings,
                ),
                Size: String(variant.Size ?? ""),
                Color: String(variant.Color ?? ""),
                waistSize: String(variant.waistSize ?? ""),
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
        setSuccess("Copia preparada como inventario. Revisa los SKU antes de guardar.");

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
    [canManageCatalog, clearVariantDraft, imageFiles, priceInputSettings],
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
            // Response is not JSON (e.g. nginx HTML error) - use the generic message
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

  const buildCompleteProductPayload = (
    variantsToSync: EditableVariant[],
    publishedOverride = form.published,
  ) => ({
    title: form.title.trim(),
    description: form.description.trim() || null,
    published: publishedOverride,
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
      waistSize: variant.waistSize.trim() || null,
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
      setSuccess("Producto inventario creado. Las imagenes se suben en segundo plano.");
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

  const importImagesFromDrive = useCallback(async (forceAccountSelection = false) => {
    if (!canManageCatalog) {
      setError("El vendedor puede consultar productos, pero no crear ni editar el catalogo.");
      return;
    }

    if (importingDriveImages) {
      return;
    }

    const clientId = getGoogleClientId();
    const apiKey = getGoogleApiKey();
    const appId = getGoogleDriveAppId(clientId);

    if (!clientId || !apiKey || !appId) {
      setError("Google Drive no esta configurado en este frontend.");
      return;
    }

    const availableSlots = Math.max(
      0,
      10 - existingImages.length - imageFiles.length,
    );

    if (availableSlots <= 0) {
      setError("El producto ya tiene el maximo de 10 imagenes.");
      return;
    }

    setImportingDriveImages(true);
    setError("");

    try {
      const productId = editingProductId ?? (await ensureProductExistsForImageUploads());
      if (!productId) {
        return;
      }

      await Promise.all([loadGoogleIdentityScript(), loadGooglePickerScript()]);
      const accessToken = await requestGoogleDriveAccessToken(
        clientId,
        driveAccountEmail,
        forceAccountSelection,
      );
      const accountEmail = await fetchGoogleDriveAccountEmail(accessToken);
      if (accountEmail) {
        writeStoredDriveAccountEmail(accountEmail);
        setDriveAccountEmail(accountEmail);
      }
      const docs = await openGoogleDrivePicker(apiKey, accessToken, appId, availableSlots);
      const selectedImages = docs
        .filter((doc) => doc.id)
        .slice(0, availableSlots);

      if (selectedImages.length === 0) {
        return;
      }

      const oversizedImages = selectedImages.filter(
        (doc) => getDriveDocumentSizeBytes(doc) > GOOGLE_DRIVE_MAX_IMAGE_BYTES,
      );

      if (oversizedImages.length > 0) {
        const oversizedNames = oversizedImages
          .slice(0, 3)
          .map((doc) => {
            const size = getDriveDocumentSizeBytes(doc);
            return `${doc.name ?? "Imagen sin nombre"} (${formatMegabytes(size)})`;
          })
          .join(", ");
        const extraCount = oversizedImages.length - 3;
        setError(
          `No se importo desde Drive: ${oversizedNames}${
            extraCount > 0 ? ` y ${extraCount} mas` : ""
          }. Cada imagen debe pesar menos de 8 MB.`,
        );
        return;
      }

      const imported = await api(`/products/${productId}/images/import-drive`, {
        method: "POST",
        timeoutMs: 120_000,
        body: JSON.stringify({
          accessToken,
          files: selectedImages.map((doc, index) => ({
            fileId: doc.id,
            ...defaultImageLayout(existingImages.length + imageFiles.length + index),
          })),
        }),
      }) as Array<{
        id: number;
        url: string;
        position?: number;
        offsetX?: number;
        offsetY?: number;
        zoom?: number;
      }>;

      const importedImages = imported.map((image, index) => ({
        id: image.id,
        url: image.url,
        position: Number(image.position ?? existingImages.length + imageFiles.length + index),
        offsetX: Number(image.offsetX ?? 0),
        offsetY: Number(image.offsetY ?? 0),
        zoom: Number(image.zoom ?? 1),
      }));

      setExistingImages((current) => [...current, ...importedImages]);
      setOriginalImageIds((current) => [
        ...current,
        ...importedImages.map((image) => image.id),
      ]);
      setSuccess(
        importedImages.length === 1
          ? "Imagen importada desde Drive."
          : `${importedImages.length} imagenes importadas desde Drive.`,
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron importar las imagenes desde Drive.",
      );
    } finally {
      setImportingDriveImages(false);
    }
  }, [
    canManageCatalog,
    editingProductId,
    ensureProductExistsForImageUploads,
    existingImages.length,
    driveAccountEmail,
    imageFiles.length,
    importingDriveImages,
  ]);

  const saveProduct = async (autoGenerateSkus = false, publishedOverride = form.published) => {
    if (!canManageCatalog) {
      setError("El vendedor puede consultar productos, pero no crear ni editar el catalogo.");
      return;
    }

    if (saving) {
      return;
    }

    let productId = editingProductId;
    let labelPrintPromptAfterSave: {
      productId: number;
      productTitle: string;
    } | null = null;

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
      const savedProductTitle = form.title.trim();
      const baseVariantsToSync = buildVariantsToPersist();
      const shouldGenerateSkus = autoGenerateSkus || regenerateSkusOnNextSave;

      if (
        baseVariantsToSync.some(
          (variant) => (!shouldGenerateSkus && !variant.sku.trim()) || parsePriceInput(variant.price) <= 0,
        )
      ) {
        showToast(shouldGenerateSkus ? "Cada variante necesita precio." : "Cada variante necesita SKU y precio.");
        setError("");
        setSaving(false);
        return;
      }

      const variantsToSync = shouldGenerateSkus
        ? await generateAutomaticSkus(baseVariantsToSync)
        : baseVariantsToSync;

      const savedProduct = editingProductId
        ? await api(`/products/${editingProductId}/save-complete`, {
            method: "PATCH",
            body: JSON.stringify(buildCompleteProductPayload(variantsToSync, publishedOverride)),
          })
        : await api("/products/save-complete", {
            method: "POST",
            body: JSON.stringify(buildCompleteProductPayload(variantsToSync, publishedOverride)),
          });

      productId = savedProduct?.id ?? productId;

      if (!productId) {
        throw new Error("Producto no encontrado");
      }

      if (!wasEditing && savedProduct?.id) {
        setEditingProductId(savedProduct.id);
      }
      setRegenerateSkusOnNextSave(false);

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
      const refreshedProduct =
        nextProducts.find((item) => item.id === productId) ??
        (wasEditing ? await fetchAdminProduct(productId) : null);

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
        labelPrintPromptAfterSave = {
          productId,
          productTitle: savedProductTitle || "Producto guardado",
        };
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
      labelPrintPromptAfterSave = {
        productId,
        productTitle: savedProductTitle || "Producto guardado",
      };
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
      if (labelPrintPromptAfterSave) {
        setPendingLabelPrintPrompt(labelPrintPromptAfterSave);
      }
    }
  };

  const openLabelsForProduct = (productId: number) => {
    setPendingLabelPrintPrompt(null);
    resetForm();
    setActiveTab("catalog");
    setWizardStep("info");
    const params = new URLSearchParams(window.location.search);
    params.set("section", "admin-labels");
    params.set("productId", String(productId));
    router.replace(`/account?${params.toString()}`);
  };

  const downloadStockLabelsForProduct = async (productId: number) => {
    if (printingLabelProductId) {
      return;
    }

    setPrintingLabelProductId(productId);
    try {
      const blob = await apiBlob("/admin/labels/product-stock-pdf", {
        method: "POST",
        body: JSON.stringify({ productId }),
      });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `etiquetas-producto-${productId}.pdf`;
      anchor.click();
      URL.revokeObjectURL(href);
      setPendingLabelPrintPrompt(null);
      showToast("Etiquetas descargadas. Imprimilas al 100%, sin ajustar a pagina.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudieron descargar las etiquetas.");
    } finally {
      setPrintingLabelProductId(null);
    }
  };

  const currentWizardIndex = productWizardSteps.findIndex((step) => step.id === wizardStep);
  const scrollWizardIntoView = () => {
    window.requestAnimationFrame(() => {
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const selectWizardStep = (step: ProductWizardStep) => {
    setWizardStep(step);
    scrollWizardIntoView();
  };
  const goWizard = (direction: 1 | -1) => {
    const nextIndex = Math.min(
      productWizardSteps.length - 1,
      Math.max(0, currentWizardIndex + direction),
    );
    selectWizardStep(productWizardSteps[nextIndex]?.id ?? "info");
  };

  const goNextWizard = () => {
    if (wizardStep === "variants" && variants.length === 0) {
      setConfirmContinueWithoutVariants(true);
      return;
    }

    goWizard(1);
  };

  const saveWithPublicationChoice = (published: boolean) => {
    setForm((current) => ({ ...current, published }));
    void saveProduct(false, published);
  };

  useEffect(() => {
    const isTypingMultiline = (target: EventTarget | null) =>
      target instanceof HTMLTextAreaElement;

    const handlePopupKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" && event.key !== "Enter") return;

      if (event.key === "Enter" && isTypingMultiline(event.target)) return;

      if (pendingRemoval) {
        event.preventDefault();
        if (event.key === "Escape") {
          setPendingRemoval(null);
        } else {
          void confirmRemoval();
        }
        return;
      }

      if (pendingVariantSwitch) {
        event.preventDefault();
        if (event.key === "Escape") {
          setPendingVariantSwitch(null);
        } else {
          handleVariantSaveAndContinue();
        }
        return;
      }

      if (attributeDraft) {
        event.preventDefault();
        if (event.key === "Escape") {
          closeAttributeModal();
        } else if (!editingValueKey) {
          void saveAttributeDraft();
        }
        return;
      }

      if (confirmContinueWithoutVariants) {
        event.preventDefault();
        if (event.key === "Escape") {
          setConfirmContinueWithoutVariants(false);
        } else {
          setConfirmContinueWithoutVariants(false);
          goWizard(1);
        }
        return;
      }

      if (pendingLabelPrintPrompt) {
        event.preventDefault();
        if (event.key === "Escape") {
          setPendingLabelPrintPrompt(null);
        } else if (printingLabelProductId !== pendingLabelPrintPrompt.productId) {
          void downloadStockLabelsForProduct(pendingLabelPrintPrompt.productId);
        }
        return;
      }

      if (duplicateSkuPrompt) {
        event.preventDefault();
        if (event.key === "Escape") {
          setDuplicateSkuPrompt(null);
        } else {
          void saveProduct(true);
        }
        return;
      }

      if (event.key === "Escape" && editingVariantIndex !== null) {
        event.preventDefault();
        handleVariantDiscard();
      }
    };

    window.addEventListener("keydown", handlePopupKeyDown);
    return () => window.removeEventListener("keydown", handlePopupKeyDown);
  }, [
    attributeDraft,
    confirmContinueWithoutVariants,
    confirmRemoval,
    duplicateSkuPrompt,
    downloadStockLabelsForProduct,
    editingValueKey,
    editingVariantIndex,
    goWizard,
    handleVariantDiscard,
    handleVariantSaveAndContinue,
    pendingLabelPrintPrompt,
    pendingRemoval,
    pendingVariantSwitch,
    printingLabelProductId,
    saveAttributeDraft,
    saveProduct,
    variants.length,
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

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
            onClick={() => selectWizardStep(step.id)}
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
            <h3 style={title3Style}>Informacion y logistica</h3>
          </div>
          <div style={wizardSubpanelStyle}>
            <strong>Datos principales</strong>
            <input
              value={form.title}
              onChange={(event) => handleProductTitleChange(event.target.value)}
              placeholder="Nombre del producto"
              style={largeFieldStyle}
            />
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Descripcion"
              style={{ ...largeFieldStyle, minHeight: 150, resize: "vertical" }}
            />
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
            <p style={eyebrowStyle}>Paso 2</p>
            <h3 style={title3Style}>Imagenes</h3>
            <p style={copyStyle}>Hasta 10 imagenes. La primera es la portada. Usa los controles de orden de cada imagen y arrastra dentro del marco para encuadrar.</p>
          </div>
          <div style={imageSourceActionsStyle}>
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
            <button
              type="button"
              onClick={() => void importImagesFromDrive()}
              disabled={importingDriveImages}
              style={secondaryButtonStyle}
            >
              {importingDriveImages ? "Importando..." : "Elegir desde Drive"}
            </button>
            {driveAccountEmail ? (
              <>
                <span style={metaStyle}>{driveAccountEmail}</span>
                <button
                  type="button"
                  onClick={() => void importImagesFromDrive(true)}
                  disabled={importingDriveImages}
                  style={ghostButtonStyle}
                >
                  Cambiar cuenta
                </button>
              </>
            ) : null}
          </div>
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
            <p style={eyebrowStyle}>Paso 3</p>
            <h3 style={title3Style}>Atributos</h3>
            <p style={copyStyle}>
              Abrí un atributo, tocá los valores que corresponden y seguí. Los atributos con valores seleccionados se usan para generar variantes.
            </p>
          </div>

          <details style={quickCreateAttributeStyle}>
            <summary style={quickCreateSummaryStyle}>+ Crear atributo</summary>
            <div style={rowWrapStyle}>
              <input value={newOptionName} onChange={(event) => setNewOptionName(event.target.value)} placeholder="Nuevo atributo" style={smallFieldStyle} />
              <button type="button" onClick={createOption} disabled={creatingOption || !newOptionName.trim()} style={secondaryButtonStyle}>
                {creatingOption ? "Creando..." : "Crear atributo"}
              </button>
            </div>
          </details>

          <div style={attributeAccordionStyle}>
            {options.filter((option) => !isVariantConfigOption(option)).map((option) => {
              const selectedValues = selectedOptionValues[option.id] ?? [];
              const availableValues = option.reusableValues ?? [];
              const orderedValues = [
                ...availableValues.filter((value) => selectedValues.includes(value.value)),
                ...availableValues.filter((value) => !selectedValues.includes(value.value)),
              ];
              const isOpen = openOptionId === option.id;
              const selectedPreview = selectedValues.slice(0, 4).join(", ");

              return (
                <article key={option.id} style={attributeAccordionItemStyle(isOpen)}>
                  <button
                    type="button"
                    onClick={() => setOpenOptionId((current) => (current === option.id ? null : option.id))}
                    style={attributeAccordionHeaderStyle}
                  >
                    <span style={attributeHeaderTitleStyle}>
                      <strong>{option.name}</strong>
                      <small style={metaStyle}>
                        {selectedValues.length > 0
                          ? `${selectedValues.length} seleccionado${selectedValues.length > 1 ? "s" : ""}${selectedPreview ? `: ${selectedPreview}${selectedValues.length > 4 ? "..." : ""}` : ""}`
                          : "Sin seleccion"}
                      </small>
                    </span>
                    <span style={attributeHeaderMetaStyle}>
                      {availableValues.length} valores
                      <b style={attributeChevronStyle(isOpen)}>v</b>
                    </span>
                  </button>

                  {isOpen ? (
                    <div style={attributeAccordionBodyStyle}>
                      {selectedValues.length > 0 ? (
                        <div style={attributePanelActionsStyle}>
                          <span style={metaStyle}>
                            {selectedValues.length} seleccionado{selectedValues.length > 1 ? "s" : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOptionValues((current) => {
                                const next = { ...current };
                                delete next[option.id];
                                return next;
                              });
                              setSelectedVariantAttributeIds((current) => current.filter((id) => id !== option.id));
                            }}
                            style={clearAttributeButtonStyle}
                          >
                            Limpiar
                          </button>
                        </div>
                      ) : null}

                      <div style={attributeValuesGridStyle}>
                        {orderedValues.map((value) => {
                          const selected = selectedValues.includes(value.value);

                          return (
                            <button
                              key={`${option.id}-${value.id}`}
                              type="button"
                              onClick={() => toggleOptionValue(option.id, value.value)}
                              style={attributeSelectChipStyle(selected)}
                            >
                              {value.visualColor ? <span style={colorSwatchStyle(value.visualColor)} /> : null}
                              {value.value}
                            </button>
                          );
                        })}
                      </div>

                      <div style={rowWrapStyle}>
                        <input value={draftOptionValues[option.id] ?? ""} onChange={(event) => setDraftOptionValues((current) => ({ ...current, [option.id]: event.target.value }))} placeholder={`Nuevo valor para ${option.name}`} style={smallFieldStyle} />
                        <button type="button" onClick={() => addOptionValue(option.id)} style={secondaryButtonStyle}>Agregar valor</button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div style={attributeSummaryStyle}>
            <strong>
              {options.filter((option) => !isVariantConfigOption(option) && (selectedOptionValues[option.id] ?? []).length > 0).length > 0
                ? `${options.filter((option) => !isVariantConfigOption(option) && (selectedOptionValues[option.id] ?? []).length > 0).length} atributo(s) seleccionados`
                : "Producto sin atributos seleccionados"}
            </strong>
            <span style={metaStyle}>
              {options.filter((option) => !isVariantConfigOption(option) && (selectedOptionValues[option.id] ?? []).length > 0).length > 0
                ? `Se pueden generar ${options.filter((option) => !isVariantConfigOption(option) && (selectedOptionValues[option.id] ?? []).length > 0).reduce((total, option) => total * Math.max(1, (selectedOptionValues[option.id] ?? []).length), 1)} variante(s).`
                : "Si no elegis atributos, podes cargar una variante unica en el paso siguiente."}
            </span>
          </div>
        </section>
      ) : null}

      {wizardStep === "variants" ? (
        <section style={wizardPanelStyle}>
          <div>
            <p style={eyebrowStyle}>Paso 4</p>
            <h3 style={title3Style}>Variantes y stock</h3>
          </div>
          <div style={wizardSubpanelStyle}>
            <strong>Generador rapido</strong>
            <span style={metaStyle}>
              Completa los datos base. Si elegiste valores en Atributos, se generan combinaciones; si no, se crea una variante unica.
            </span>
            {options.some((option) => !isVariantConfigOption(option) && (selectedOptionValues[option.id] ?? []).length > 0) ? (
              <div style={variantSourceSummaryStyle}>
                <strong>Combinaciones desde atributos</strong>
                <span style={metaStyle}>
                  {options
                    .filter((option) => !isVariantConfigOption(option) && (selectedOptionValues[option.id] ?? []).length > 0)
                    .map((option) => `${option.name}: ${(selectedOptionValues[option.id] ?? []).join(", ")}`)
                    .join(" - ")}
                </span>
              </div>
            ) : null}
            <div style={responsiveVariantGridStyle}>
              <SuggestionInput value={variantDraft.price} onChange={(value) => setVariantDraft((current) => ({ ...current, price: value }))} placeholder={variantPricePlaceholder} suggestions={variantAutocomplete.price} />
              <SuggestionInput value={variantDraft.inventoryQuantity} onChange={(value) => setVariantDraft((current) => ({ ...current, inventoryQuantity: value }))} placeholder="Stock base" suggestions={variantAutocomplete.inventoryQuantity} />
              <SuggestionInput value={variantDraft.Color} onChange={(value) => setVariantDraft((current) => ({ ...current, Color: value }))} placeholder="Color/es (Negro, Blanco)" suggestions={variantAutocomplete.color} />
              <SuggestionInput value={variantDraft.Size} onChange={(value) => setVariantDraft((current) => ({ ...current, Size: value }))} placeholder="Talle/s (S, M, L)" suggestions={variantAutocomplete.size} />
              <SuggestionInput value={variantDraft.waistSize} onChange={(value) => setVariantDraft((current) => ({ ...current, waistSize: value }))} placeholder="Talle cintura/s (36, 38, 40)" suggestions={variantAutocomplete.waistSize} />
              <SuggestionInput value={variantDraft.width} onChange={(value) => setVariantDraft((current) => ({ ...current, width: value }))} placeholder="Ancho prenda base (cm)" suggestions={variantAutocomplete.width} sanitize={sanitizeDecimalInput} />
              <SuggestionInput value={variantDraft.length} onChange={(value) => setVariantDraft((current) => ({ ...current, length: value }))} placeholder="Largo prenda base (cm)" suggestions={variantAutocomplete.length} sanitize={sanitizeDecimalInput} />
            </div>
            <button
              type="button"
              onClick={() =>
                void generateVariantsFromMatrix().catch((error) =>
                  setError(
                    error instanceof Error
                      ? error.message
                      : "No se pudieron generar las variantes.",
                  ),
                )
              }
              style={primaryButtonStyle}
            >
              Generar variantes
            </button>
          </div>
          {selectedVariantIndexes.length > 0 ? (
            <div style={wizardSubpanelStyle}>
              <strong>Edicion masiva ({selectedVariantIndexes.length})</strong>
              <div style={variantGridStyle}>
                <input value={bulkVariantPatch.price} onChange={(event) => setBulkVariantPatch((current) => ({ ...current, price: event.target.value }))} placeholder={`Cambiar ${variantPricePlaceholder.toLowerCase()}`} style={fieldStyle} />
                <input value={bulkVariantPatch.stock} onChange={(event) => setBulkVariantPatch((current) => ({ ...current, stock: event.target.value }))} placeholder="Cambiar stock" style={fieldStyle} />
                <SuggestionInput value={bulkVariantPatch.color} onChange={(value) => setBulkVariantPatch((current) => ({ ...current, color: value }))} placeholder="Cambiar color" suggestions={variantAutocomplete.color} />
                <SuggestionInput value={bulkVariantPatch.size} onChange={(value) => setBulkVariantPatch((current) => ({ ...current, size: value }))} placeholder="Cambiar talle" suggestions={variantAutocomplete.size} />
                <SuggestionInput value={bulkVariantPatch.waistSize} onChange={(value) => setBulkVariantPatch((current) => ({ ...current, waistSize: value }))} placeholder="Cambiar talle cintura" suggestions={variantAutocomplete.waistSize} />
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
                  <th style={thStyle}>Talle cintura</th>
                  <th style={thStyle}>Precio</th>
                  <th style={thStyle}>Stock</th>
                  <th style={thStyle}>Ancho prenda</th>
                  <th style={thStyle}>Largo prenda</th>
                  <th style={thStyle}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant, index) => (
                  <tr key={variant.id ?? index}>
                    <td style={tdStyle}><input type="checkbox" checked={selectedVariantIndexes.includes(index)} onChange={() => toggleVariantSelection(index)} /></td>
                    <td style={tdStyle}>
                      <input
                        value={variant.sku}
                        onChange={(event) => updateVariantAt(index, { sku: event.target.value })}
                        placeholder="SKU"
                        style={compactCellInputStyle}
                      />
                    </td>
                    <td style={tdStyle}>
                      <SuggestionInput
                        value={variant.Color}
                        onChange={(value) => updateVariantAt(index, { Color: value })}
                        placeholder="Color"
                        suggestions={variantAutocomplete.color}
                        inputStyleOverride={compactCellInputStyle}
                      />
                    </td>
                    <td style={tdStyle}>
                      <SuggestionInput
                        value={variant.Size}
                        onChange={(value) => updateVariantAt(index, { Size: value })}
                        placeholder="Talle"
                        suggestions={variantAutocomplete.size}
                        inputStyleOverride={compactCellInputStyle}
                      />
                    </td>
                    <td style={tdStyle}>
                      <SuggestionInput
                        value={variant.waistSize}
                        onChange={(value) => updateVariantAt(index, { waistSize: value })}
                        placeholder="Talle cintura"
                        suggestions={variantAutocomplete.waistSize}
                        inputStyleOverride={compactCellInputStyle}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        value={variant.price}
                        onChange={(event) => updateVariantAt(index, { price: sanitizeDecimalInput(event.target.value) })}
                        placeholder={variantPricePlaceholder}
                        style={compactCellInputStyle}
                      />
                    </td>
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
        <section style={publishWizardPanelStyle}>
          <div>
            <p style={eyebrowStyle}>Paso 5</p>
            <h3 style={title3Style}>Publicacion</h3>
          </div>
          <div style={publicationGridStyle}>
            <button
              type="button"
              onClick={() => saveWithPublicationChoice(true)}
              disabled={saving || !form.title.trim()}
              style={publicationChoiceStyle(form.published)}
            >
              Publicar ahora
            </button>
            <button
              type="button"
              onClick={() => saveWithPublicationChoice(false)}
              disabled={saving || !form.title.trim()}
              style={publicationChoiceStyle(!form.published)}
            >
              Guardar en inventario
            </button>
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
            <button type="button" style={primaryButtonStyle} onClick={goNextWizard}>Siguiente</button>
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
        <input
          value={productQuery}
          onChange={(event) => {
            setProductPage(1);
            setProductQuery(event.target.value);
          }}
          placeholder="Buscar productos"
          style={responsiveSearchFieldStyle}
        />
        <select
          value={productCategoryFilter}
          onChange={(event) => {
            setProductPage(1);
            setProductCategoryFilter(event.target.value);
          }}
          style={responsiveSelectStyle}
        >
          <option value="all">Todas las categorias</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <select
          value={productStatusFilter}
          onChange={(event) => {
            setProductPage(1);
            setProductStatusFilter(event.target.value as typeof productStatusFilter);
          }}
          style={responsiveSelectStyle}
        >
          <option value="all">Todos los estados</option>
          <option value="published">Publicado</option>
          <option value="draft">Inventario</option>
          <option value="without-stock">Sin stock</option>
        </select>
        {canManageCatalog ? (
          <button type="button" onClick={startNewProduct} style={primaryButtonStyle}>+ Crear nuevo producto</button>
        ) : null}
      </div>
      <div style={statsGridStyle}>
        <Stat label="Productos totales" value={String(productMetrics.total)} />
        <Stat label="Publicados" value={String(productMetrics.published)} />
        <Stat label="Inventario" value={String(productMetrics.draft)} />
        <Stat label="Sin stock" value={String(productMetrics.withoutStock)} />
      </div>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <SortableProductTh sortKey="images" activeKey={productSortKey} direction={productSortDirection} onSort={changeProductSort}>Imagen</SortableProductTh>
              <SortableProductTh sortKey="product" activeKey={productSortKey} direction={productSortDirection} onSort={changeProductSort}>Producto</SortableProductTh>
              <SortableProductTh sortKey="category" activeKey={productSortKey} direction={productSortDirection} onSort={changeProductSort}>Categoria</SortableProductTh>
              <SortableProductTh sortKey="variants" activeKey={productSortKey} direction={productSortDirection} onSort={changeProductSort}>Variantes</SortableProductTh>
              <SortableProductTh sortKey="stock" activeKey={productSortKey} direction={productSortDirection} onSort={changeProductSort}>Stock total</SortableProductTh>
              <SortableProductTh sortKey="status" activeKey={productSortKey} direction={productSortDirection} onSort={changeProductSort}>Estado</SortableProductTh>
              <SortableProductTh sortKey="price" activeKey={productSortKey} direction={productSortDirection} onSort={changeProductSort}>Precio desde</SortableProductTh>
              {canManageCatalog ? <th style={thStyle}>Acciones</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={canManageCatalog ? 8 : 7} style={tdStyle}>Cargando catalogo...</td></tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={canManageCatalog ? 8 : 7} style={tdStyle}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <span>No hay productos para mostrar.</span>
                    <button type="button" onClick={() => void loadData()} style={ghostButtonStyle}>
                      Recargar productos
                    </button>
                  </div>
                </td>
              </tr>
            ) : sortedProducts.map((product) => {
              const priceFrom = getProductPriceFrom(product, priceInputSettings);

              return (
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
                <td style={tdStyle}>{priceFrom ? money(priceFrom) : "-"}</td>
                {canManageCatalog ? (
                  <td style={tdStyle}>
                    <div style={iconActionsStyle}>
                      <button
                        type="button"
                        title={product.published ? "Despublicar producto" : "Publicar producto"}
                        aria-label={product.published ? "Despublicar producto" : "Publicar producto"}
                        onClick={() => void toggleProductPublication(product)}
                        disabled={publishingProductId === product.id}
                        style={publicationActionButtonStyle(product.published, publishingProductId === product.id)}
                      >
                        {publishingProductId === product.id
                          ? "..."
                          : product.published
                            ? "Despublicar"
                            : "Publicar"}
                      </button>
                      <button type="button" title="Editar" aria-label="Editar producto" onClick={() => void hydrateFormFromProduct(product)} style={iconButtonStyle}>&#9998;</button>
                      <button type="button" title="Duplicar" aria-label="Duplicar producto" onClick={() => void duplicateProductDraft(product)} style={iconButtonStyle}>&#10697;</button>
                      <button type="button" title="Eliminar" aria-label="Eliminar producto" onClick={() => setPendingRemoval({ kind: "product", productId: product.id, productTitle: product.title, productsCount: 0 })} style={iconButtonStyle}>&times;</button>
                    </div>
                  </td>
                ) : null}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={paginationBarStyle}>
        <span style={metaStyle}>
          Mostrando {filteredProducts.length} de {productTotal} productos
        </span>
        <div style={rowWrapStyle}>
          <button
            type="button"
            onClick={() => setProductPage((current) => Math.max(1, current - 1))}
            disabled={loading || productPage <= 1}
            style={ghostButtonStyle}
          >
            Anterior
          </button>
          <span style={metaStyle}>
            Pagina {productPage} de {productTotalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setProductPage((current) => Math.min(productTotalPages, current + 1))
            }
            disabled={loading || productPage >= productTotalPages}
            style={ghostButtonStyle}
          >
            Siguiente
          </button>
        </div>
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
              {canManageCatalog ? (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab("options")}
                    style={workspaceTabStyle(activeTab === "options")}
                  >
                    Atributos
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("variant-options")}
                    style={workspaceTabStyle(activeTab === "variant-options")}
                  >
                    Opciones de variantes
                  </button>
                </>
              ) : null}
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
            display: activeTab === "create" && canManageCatalog ? "grid" : "none",
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
                onChange={(event) => handleProductTitleChange(event.target.value)}
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
            <div style={imageSourceActionsStyle}>
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
              <button
                type="button"
                onClick={() => void importImagesFromDrive()}
                disabled={importingDriveImages}
                style={secondaryButtonStyle}
              >
                {importingDriveImages ? "Importando..." : "Elegir desde Drive"}
              </button>
              {driveAccountEmail ? (
                <>
                  <span style={metaStyle}>{driveAccountEmail}</span>
                  <button
                    type="button"
                    onClick={() => void importImagesFromDrive(true)}
                    disabled={importingDriveImages}
                    style={ghostButtonStyle}
                  >
                    Cambiar cuenta
                  </button>
                </>
              ) : null}
            </div>
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
                    secondaryText={`${(entry.file.size / 1024 / 1024).toFixed(2)} MB - ${
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
                value={variantDraft.waistSize}
                onChange={(value) =>
                  setVariantDraft((current) => ({ ...current, waistSize: value }))
                }
                placeholder="Talle cintura"
                suggestions={variantAutocomplete.waistSize}
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
                          {[variant.Size, variant.Color, variant.waistSize].filter(Boolean).join(" / ") || "Base"}
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
                                [variant.sku, variant.Size, variant.Color, variant.waistSize]
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
                            {[variant.Size, variant.Color, variant.waistSize]
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
                                      [variant.sku, variant.Size, variant.Color, variant.waistSize]
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
                {sortedProducts.map((product) => (
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
                        {product.published ? "Publicado" : "Inventario"}
                      </span>
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <span style={metaStyle}>
                        {(product.categories ?? [])
                          .map((entry) => entry.category.name)
                          .join(", ") || "Sin categorias"}
                      </span>
                      <span style={copyStyle}>
                        {product.images?.length ?? 0} imagenes - {product.variants?.length ?? 0} variantes
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
                      <SortableProductTh sortKey="product" activeKey={productSortKey} direction={productSortDirection} onSort={changeProductSort}>Producto</SortableProductTh>
                      <SortableProductTh sortKey="status" activeKey={productSortKey} direction={productSortDirection} onSort={changeProductSort}>Estado</SortableProductTh>
                      <SortableProductTh sortKey="category" activeKey={productSortKey} direction={productSortDirection} onSort={changeProductSort}>Categorias</SortableProductTh>
                      <SortableProductTh sortKey="images" activeKey={productSortKey} direction={productSortDirection} onSort={changeProductSort}>Imagenes</SortableProductTh>
                      <SortableProductTh sortKey="variants" activeKey={productSortKey} direction={productSortDirection} onSort={changeProductSort}>Variantes</SortableProductTh>
                      <th style={thStyle}>Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProducts.map((product) => (
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
                            {product.published ? "Publicado" : "Inventario"}
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
            ...stackedSectionStyle,
            display: activeTab === "variant-options" ? "grid" : "none",
          }}
        >
          <div style={blockStyle}>
            <div>
              <p style={eyebrowStyle}>Variantes</p>
              <h3 style={title3Style}>Opciones de variantes</h3>
              <p style={helperTextStyle}>
                Estos valores alimentan los desplegables de Color y Talle al cargar variantes. No se usan como atributos del producto.
              </p>
            </div>
            <div style={variantOptionCardsGridStyle}>
              {variantConfigOptions.map(({ definition, option }) => (
                <article key={definition.kind} style={variantOptionCardStyle}>
                  <div style={betweenStyle}>
                    <div>
                      <strong style={{ color: "var(--account-text-strong)" }}>{definition.label}</strong>
                      <p style={{ ...helperTextStyle, margin: "6px 0 0" }}>{definition.description}</p>
                    </div>
                    <span style={statusChipStyle(option ? "active" : "draft")}>
                      {option ? `${option.reusableValues?.length ?? 0} valores` : "Sin crear"}
                    </span>
                  </div>

                  {option ? (
                    <>
                      <div style={variantOptionValuesStyle}>
                        {(option.reusableValues ?? []).map((value) => (
                          <div key={`${option.id}-${value.id}`} style={variantOptionValueChipStyle}>
                            {option.attributeType === "color" && value.visualColor ? <span style={colorSwatchStyle(value.visualColor)} /> : null}
                            {editingValueKey === `${option.id}:${value.value.toLowerCase()}` ? (
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
                            <span style={variantOptionChipActionsStyle}>
                              <button type="button" title="Renombrar" onClick={() => startEditingValue(option.id, value.value)} style={compactChipIconButtonStyle}>&#9998;</button>
                              <button type="button" title="Eliminar" onClick={() => setPendingRemoval({ kind: "value", optionId: option.id, optionName: option.name, value: value.value, productsCount: value.productsCount ?? 0 })} style={compactChipIconButtonStyle}>&times;</button>
                            </span>
                          </div>
                        ))}
                      </div>
                      <div style={variantOptionAddRowStyle}>
                        <input
                          value={draftOptionValues[option.id] ?? ""}
                          onChange={(event) =>
                            setDraftOptionValues((current) => ({
                              ...current,
                              [option.id]: event.target.value,
                            }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") void createReusableAttributeValue(option.id);
                          }}
                          placeholder={`Agregar ${definition.label.toLowerCase()}`}
                          style={variantOptionInputStyle}
                        />
                        <button type="button" onClick={() => void createReusableAttributeValue(option.id)} style={secondaryButtonStyle}>
                          Agregar
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void createVariantConfigOption(definition)}
                      disabled={savingOptionKey === `variant-option-${definition.kind}`}
                      style={secondaryButtonStyle}
                    >
                      {savingOptionKey === `variant-option-${definition.kind}` ? "Creando..." : `Crear ${definition.name}`}
                    </button>
                  )}
                </article>
              ))}
            </div>
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
            readOnly={!canManageCatalog}
            onCategoriesChange={async () => {
              await loadData();
            }}
          />
        </section>
      </section>
      {pendingRemoval ? (
        <div
          style={confirmModalOverlayStyle}
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
                      ? "La variante se quitara del inventario actual del producto."
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
      {confirmContinueWithoutVariants ? (
        <div
          style={modalOverlayStyle}
          role="presentation"
          onClick={() => setConfirmContinueWithoutVariants(false)}
        >
          <div
            style={modalCardStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="continue-without-variants-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <p style={eyebrowStyle}>Variantes</p>
              <strong
                id="continue-without-variants-title"
                style={{ color: "var(--account-text-strong)", fontSize: 22, lineHeight: 1.1 }}
              >
                No has creado ninguna variante, quieres continuar?
              </strong>
              <p style={copyStyle}>
                Si continuas, el producto quedara sin variantes de stock hasta que lo completes.
              </p>
            </div>
            <div style={modalActionsStyle}>
              <button
                type="button"
                onClick={() => setConfirmContinueWithoutVariants(false)}
                style={ghostButtonStyle}
              >
                No, volver
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmContinueWithoutVariants(false);
                  goWizard(1);
                }}
                style={primaryButtonStyle}
              >
                Si, continuar
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {pendingLabelPrintPrompt ? (
        <div
          style={modalOverlayStyle}
          role="presentation"
          onClick={() => setPendingLabelPrintPrompt(null)}
        >
          <div
            style={modalCardStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="label-print-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <p style={eyebrowStyle}>Impresion de etiquetas</p>
              <strong
                id="label-print-title"
                style={{ color: "var(--account-text-strong)", fontSize: 22, lineHeight: 1.1 }}
              >
                Queres imprimir etiquetas?
              </strong>
              <p style={copyStyle}>
                Voy a descargar un PDF para &quot;
                {pendingLabelPrintPrompt.productTitle}&quot; usando la plantilla y cantidad predeterminadas.
              </p>
            </div>
            <div style={modalActionsStyle}>
              <button
                type="button"
                onClick={() => setPendingLabelPrintPrompt(null)}
                style={ghostButtonStyle}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => void downloadStockLabelsForProduct(pendingLabelPrintPrompt.productId)}
                disabled={printingLabelProductId === pendingLabelPrintPrompt.productId}
                style={primaryButtonStyle}
              >
                {printingLabelProductId === pendingLabelPrintPrompt.productId ? "Descargando..." : "Si"}
              </button>
            </div>
          </div>
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
  readOnly = false,
}: {
  onCategoriesChange?: () => Promise<void> | void;
  readOnly?: boolean;
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
    if (readOnly) return;

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
    if (readOnly) return;

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
    const handlePopupKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" && event.key !== "Enter") return;
      if (event.key === "Enter" && event.target instanceof HTMLTextAreaElement) return;

      if (pendingRemoval) {
        event.preventDefault();
        if (event.key === "Escape") {
          setPendingRemoval(null);
        } else if (!saving && !(pendingRemoval.action === "reassign" && !pendingRemoval.reassignToId)) {
          void removeCategory();
        }
        return;
      }

      if (draft && !readOnly) {
        event.preventDefault();
        if (event.key === "Escape") {
          setDraft(null);
          setPendingImageFile(null);
        } else if (!saving) {
          void saveCategory();
        }
      }
    };

    window.addEventListener("keydown", handlePopupKeyDown);
    return () => window.removeEventListener("keydown", handlePopupKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, pendingRemoval, readOnly, saving]);

  return (
    <>
      <div style={catalogToolbarStyle}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar categorias"
          style={searchFieldStyle}
        />
        {!readOnly ? (
          <button type="button" onClick={() => openCategoryModal()} style={primaryButtonStyle}>
            + Nueva categoria
          </button>
        ) : null}
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
                  readOnly={readOnly}
                />
                <input value={draft.slug} placeholder="Slug automatico" style={fieldStyle} disabled />
                <select
                  value={draft.status}
                  onChange={(event) => setDraft((current) => current ? { ...current, status: event.target.value as CategoryDraft["status"] } : current)}
                  style={selectStyle}
                  disabled={readOnly}
                >
                  <option value="active">Activa</option>
                  <option value="hidden">Oculta</option>
                </select>
                <select
                  value={draft.parentId}
                  onChange={(event) => setDraft((current) => current ? { ...current, parentId: event.target.value } : current)}
                  style={selectStyle}
                  disabled={readOnly}
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
                readOnly={readOnly}
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
              {!readOnly ? (
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
              ) : null}
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
              {draft.id && !readOnly ? (
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
              {!readOnly ? (
                <button
                  type="button"
                  onClick={() => void saveCategory()}
                  style={primaryButtonStyle}
                  disabled={saving || uploadingImage}
                >
                  {saving || uploadingImage ? "Guardando..." : "Guardar"}
                </button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {pendingRemoval ? (
        <div
          style={confirmModalOverlayStyle}
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
  inputStyleOverride,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  suggestions: string[];
  sanitize?: (value: string) => string;
  inputStyleOverride?: React.CSSProperties;
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
        style={inputStyleOverride ?? fieldStyle}
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
const variantOptionCardsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))",
  gap: 14,
  alignItems: "start",
};
const variantOptionCardStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--checkout-border)",
  background: "var(--page-panel-bg)",
  padding: 16,
  display: "grid",
  gap: 14,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  alignContent: "start",
  minHeight: "auto",
};
const variantOptionValuesStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  alignContent: "start",
  gap: 8,
};
const variantOptionValueChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  minHeight: 34,
  maxWidth: "100%",
  padding: "6px 8px 6px 12px",
  borderRadius: 999,
  border: "1px solid var(--checkout-border)",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-strong)",
  fontSize: 14,
  lineHeight: 1.1,
};
const variantOptionChipActionsStyle: React.CSSProperties = {
  display: "inline-flex",
  gap: 3,
  flex: "0 0 auto",
};
const compactChipIconButtonStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 999,
  border: "1px solid var(--checkout-border)",
  background: "var(--page-panel-bg)",
  color: "var(--account-text-strong)",
  cursor: "pointer",
  lineHeight: 1,
  padding: 0,
};
const variantOptionAddRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 10,
  alignItems: "center",
};
const variantOptionInputStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  padding: "14px 16px",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-strong)",
  border: "1px solid var(--checkout-border)",
  borderRadius: 16,
  outline: "none",
  boxSizing: "border-box",
  minWidth: 0,
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
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 90,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
  padding: "14px clamp(18px, 3vw, 42px) calc(14px + env(safe-area-inset-bottom))",
  borderTop: "1px solid var(--checkout-border)",
  background: "color-mix(in srgb, var(--page-panel-bg) 94%, transparent)",
  backdropFilter: "blur(16px)",
  boxShadow: "0 -18px 42px rgba(79, 151, 191, 0.12)",
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
const imageSourceActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
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
  paddingBottom: 98,
};
const wizardStepperStyle: React.CSSProperties = {
  position: "sticky",
  top: 96,
  zIndex: 80,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10,
  padding: "10px 12px",
  marginInline: -12,
  borderRadius: 18,
  border: "1px solid var(--checkout-border)",
  background: "color-mix(in srgb, var(--page-panel-bg) 92%, transparent)",
  backdropFilter: "blur(14px)",
  boxShadow: "0 14px 34px rgba(79, 151, 191, 0.10)",
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
const publishWizardPanelStyle: React.CSSProperties = {
  ...wizardPanelStyle,
  minHeight: 260,
  alignContent: "center",
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
const paginationBarStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
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
const publicationActionButtonStyle = (published: boolean, disabled: boolean): React.CSSProperties => ({
  minWidth: 94,
  height: 36,
  padding: "0 12px",
  borderRadius: 10,
  border: published
    ? "1px solid var(--admin-status-idle-border)"
    : "1px solid var(--admin-tone-success-border)",
  background: published
    ? "var(--page-panel-strong-bg)"
    : "var(--admin-tone-success-bg)",
  color: published
    ? "var(--account-text-strong)"
    : "var(--admin-tone-success-color)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: disabled ? "wait" : "pointer",
  fontSize: 12,
  fontWeight: 800,
  opacity: disabled ? 0.68 : 1,
  whiteSpace: "nowrap",
});
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
const confirmModalOverlayStyle: React.CSSProperties = {
  ...modalOverlayStyle,
  zIndex: 1300,
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
const quickCreateAttributeStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px dashed var(--checkout-border)",
  background: "var(--muted-field-bg)",
  padding: "10px 14px",
};
const quickCreateSummaryStyle: React.CSSProperties = {
  color: "var(--account-text-strong)",
  cursor: "pointer",
  fontWeight: 700,
  listStyle: "none",
};
const attributeAccordionStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};
const attributeAccordionItemStyle = (open: boolean): React.CSSProperties => ({
  borderRadius: 22,
  border: open
    ? "1px solid var(--checkout-border-strong)"
    : "1px solid var(--checkout-border)",
  background: open ? "var(--page-panel-strong-bg)" : "var(--page-panel-bg)",
  overflow: "hidden",
  boxShadow: open ? "0 18px 38px rgba(79, 151, 191, 0.10)" : "none",
});
const attributeAccordionHeaderStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 74,
  border: 0,
  background: "transparent",
  padding: "16px 18px",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 14,
  color: "var(--account-text-strong)",
  textAlign: "left",
  cursor: "pointer",
};
const attributeHeaderTitleStyle: React.CSSProperties = {
  minWidth: 0,
  display: "grid",
  gap: 6,
};
const attributeHeaderMetaStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  color: "var(--account-text-soft)",
  fontSize: 12,
  whiteSpace: "nowrap",
};
const attributeChevronStyle = (open: boolean): React.CSSProperties => ({
  width: 28,
  height: 28,
  borderRadius: 999,
  border: "1px solid var(--checkout-border)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--account-text-strong)",
  transform: open ? "rotate(180deg)" : "rotate(0deg)",
});
const attributeAccordionBodyStyle: React.CSSProperties = {
  borderTop: "1px solid var(--checkout-border)",
  padding: 18,
  display: "grid",
  gap: 16,
};
const attributePanelActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};
const attributeValuesGridStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignContent: "flex-start",
};
const attributeSelectChipStyle = (selected: boolean): React.CSSProperties => ({
  minHeight: 44,
  maxWidth: 180,
  padding: "10px 15px",
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
  gap: 8,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontWeight: selected ? 800 : 600,
});
const clearAttributeButtonStyle: React.CSSProperties = {
  border: "1px solid var(--checkout-border)",
  background: "transparent",
  color: "var(--account-text-muted)",
  borderRadius: 999,
  padding: "7px 10px",
  cursor: "pointer",
  fontSize: 12,
};
const attributeSummaryStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid var(--checkout-border)",
  background: "var(--muted-field-bg)",
  padding: 16,
  display: "grid",
  gap: 6,
};
const variantSourceSummaryStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid var(--checkout-border)",
  background: "var(--muted-field-bg)",
  padding: 14,
  display: "grid",
  gap: 6,
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
const sortButtonStyle: React.CSSProperties = {
  border: 0,
  background: "transparent",
  color: "inherit",
  padding: 0,
  font: "inherit",
  textTransform: "inherit",
  letterSpacing: "inherit",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
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
      : status === "delivered" || status === "picked_up"
        ? "1px solid var(--admin-tone-success-border)"
        : status === "shipped" || status === "ready_for_pickup"
          ? "1px solid var(--admin-tone-info-border)"
          : "1px solid var(--admin-status-idle-border)",
  background:
    status === "cancelled"
      ? "var(--admin-danger-bg)"
      : status === "delivered" || status === "picked_up"
        ? "var(--admin-tone-success-bg)"
        : status === "shipped" || status === "ready_for_pickup"
          ? "var(--admin-tone-info-bg)"
          : "var(--admin-status-idle-bg)",
  color:
    status === "cancelled"
      ? "var(--admin-danger-color)"
      : status === "delivered" || status === "picked_up"
        ? "var(--admin-tone-success-color)"
        : status === "shipped" || status === "ready_for_pickup"
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

