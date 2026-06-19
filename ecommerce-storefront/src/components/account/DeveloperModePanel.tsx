"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

function useViewportFlags() {
  const [isTabletOrSmaller, setIsTabletOrSmaller] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = window.matchMedia("(max-width: 1024px)");
    const sync = () => setIsTabletOrSmaller(q.matches);
    sync();
    q.addEventListener("change", sync);
    return () => q.removeEventListener("change", sync);
  }, []);
  return { isTabletOrSmaller };
}
import { api } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/asset-url";
import { blockThemeOverrides } from "@/config/block-theme-overrides";
import { themes } from "@/config/theme-registry";
import { buildThemeStyle } from "@/lib/theme/theme-palette-style";
import { getClientStoreId } from "@/lib/tenant/store-context";
import { getDefaultStorefrontConfig } from "@/lib/tenant/storefront-defaults";
import { mergeThemeLayout } from "@/lib/tenant/theme-layout-defaults";
import type { User } from "@/context/auth-context";
import type { Block } from "@/types/block";
import type { StorefrontThemeLayout } from "@/types/storefront-config";
import {
  themePaletteColorKeys,
  type ThemePalette,
  type ThemePaletteKey,
} from "@/types/theme";

type Category = {
  id: number;
  name: string;
  slug: string;
  storeId?: number | null;
};

type Product = {
  id: number;
  title: string;
  slug: string;
};

type StorefrontConfig = {
  theme?: string;
  themePalette?: ThemePalette;
  themeLayout?: StorefrontThemeLayout;
  pages: {
    home: Block[];
  };
};

type AdminMercadoPagoConfig = {
  publicKey: string;
  accessToken: string;
  webhookSecret: string;
  bankTransferDiscountPercentage: string;
  accessTokenConfigured: boolean;
  webhookSecretConfigured: boolean;
  accessTokenPreview?: string | null;
  webhookSecretPreview?: string | null;
};

type MercadoPagoTestResult = {
  ok: boolean;
  message?: string;
  details?: string | null;
  checks?: {
    publicKey: boolean;
    accessToken: boolean;
    webhookSecret: boolean;
  };
  account?: {
    id?: number | string | null;
    nickname?: string | null;
    email?: string | null;
  } | null;
};

type AdminCorreoArgentinoConfig = {
  enabled: boolean;
  isDefault: boolean;
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  companyName: string;
  originAddress: {
    streetName: string;
    streetNumber: string;
    floor: string;
    apartment: string;
    city: string;
    state: string;
    provinceCode: string;
    postalCode: string;
  };
  defaultAgency: string;
  deliveryTypes: string[];
  defaultPackageDimensions: {
    weightGrams: string;
    height: string;
    width: string;
    length: string;
  };
  packagingMarginPercent: string;
  extraEstimatedDays: string;
  pricing: {
    markupType: string;
    markupValue: string;
    roundToNearestHundred: boolean;
  };
  rules: {
    allowHomeDelivery: boolean;
    allowBranchDelivery: boolean;
    requireBranchSelection: boolean;
  };
  flags: {
    autoTrackingEnabled: boolean;
  };
  global: {
    mode: string;
    apiBaseUrl: string;
    apiUsernameConfigured: boolean;
    apiPasswordConfigured: boolean;
    customerIdConfigured: boolean;
    customerEmailConfigured: boolean;
    customerPasswordConfigured: boolean;
  };
};

type CorreoArgentinoTestResult = {
  ok: boolean;
  message?: string;
  details?: string | null;
  checks?: {
    apiUsernameConfigured?: boolean;
    apiPasswordConfigured?: boolean;
    customerIdConfigured?: boolean;
    customerEmailConfigured?: boolean;
    customerPasswordConfigured?: boolean;
    enabled?: boolean;
    originPostalCodeConfigured?: boolean;
    senderConfigured?: boolean;
  };
};

type BlockContextMenuState = {
  index: number;
  x: number;
  y: number;
} | null;

type FieldDefinition =
  | { key: string; label: string; type: "text" | "textarea" | "number" | "color" }
  | { key: string; label: string; type: "select"; options: Array<{ label: string; value: string }> }
  | { key: string; label: string; type: "products" | "image" };

type CategoryImageStripItem = {
  title?: string;
  image?: string;
  categorySlugs?: string[];
};

type BenefitEditorItem = {
  title?: string;
  description?: string;
  icon?: string;
  iconImage?: string;
};

const MAX_ADMIN_ASSET_UPLOAD_BYTES = 900 * 1024;
const MAX_ADMIN_ASSET_DIMENSION = 1600;
const ADMIN_ASSET_QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55, 0.45];

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

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
  mimeType = "image/jpeg",
) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

function renameFileExtension(name: string, ext: string) {
  return name.replace(/\.[^.]+$/u, "") + ext;
}

async function optimizeAdminAssetForUpload(file: File) {
  if (
    file.size <= MAX_ADMIN_ASSET_UPLOAD_BYTES &&
    /image\/(jpe?g|webp)/i.test(file.type)
  ) {
    return file;
  }

  const image = await loadImageElement(file);
  const longestSide = Math.max(image.width, image.height);
  const scale =
    longestSide > MAX_ADMIN_ASSET_DIMENSION
      ? MAX_ADMIN_ASSET_DIMENSION / longestSide
      : 1;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No se pudo preparar la imagen para subir.");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const testBlob = await canvasToBlob(canvas, 0.85, "image/webp");
  const outputMime = testBlob?.type === "image/webp" ? "image/webp" : "image/jpeg";
  const outputExt = outputMime === "image/webp" ? ".webp" : ".jpg";

  if (
    testBlob &&
    testBlob.type === outputMime &&
    testBlob.size <= MAX_ADMIN_ASSET_UPLOAD_BYTES
  ) {
    return new File([testBlob], renameFileExtension(file.name, outputExt), {
      type: outputMime,
      lastModified: Date.now(),
    });
  }

  for (const quality of ADMIN_ASSET_QUALITY_STEPS) {
    const blob = await canvasToBlob(canvas, quality, outputMime);
    if (!blob) {
      continue;
    }

    if (
      blob.size <= MAX_ADMIN_ASSET_UPLOAD_BYTES ||
      quality === ADMIN_ASSET_QUALITY_STEPS.at(-1)
    ) {
      return new File([blob], renameFileExtension(file.name, outputExt), {
        type: outputMime,
        lastModified: Date.now(),
      });
    }
  }

  throw new Error(`No se pudo reducir el peso de ${file.name}.`);
}

const blockLabels: Record<string, string> = {
  hero: "Hero",
  hero_carousel: "Hero Carousel",
  product_grid: "Product Grid",
  carousel: "Carousel",
  category_grid: "Category Grid",
  category_image_strip: "Category Image Strip",
  featured_products: "Featured Products",
  newsletter: "Newsletter",
  banner: "Banner",
  testimonials: "Testimonials",
  benefits: "Benefits",
  boutique_hero: "Boutique Hero",
};

const animationOptions = [
  { label: "Entrada por defecto", value: "" },
  { label: "Suave", value: "soft" },
  { label: "Sin animacion", value: "none" },
];

const benefitsStyleOptions = [
  { label: "Cards", value: "cards" },
  { label: "Plano", value: "plain" },
];

const benefitsIconOptions = [
  { label: "Shield", value: "shield" },
  { label: "Truck", value: "truck" },
  { label: "Heart", value: "heart" },
  { label: "Spark", value: "spark" },
  { label: "Card", value: "card" },
  { label: "Box", value: "box" },
  { label: "Bag", value: "bag" },
];

type ThemePaletteField = {
  key: ThemePaletteKey;
  label: string;
  description: string;
  autoSourceLabel?: string;
  advanced?: boolean;
};

const themePaletteGroups: Array<{
  id: "base" | "storefront" | "workspace";
  title: string;
  description: string;
  fields: ThemePaletteField[];
}> = [
  {
    id: "base",
    title: "Colores Base",
    description: "Definen la identidad general del theme: fondos, textos, bordes y acentos.",
    fields: [
      { key: "background", label: "Fondo base del sitio", description: "Color principal del storefront y base de toda la paleta." },
      { key: "backgroundSoft", label: "Fondo secundario", description: "Fondo suave para secciones, bandas y superficies intermedias." },
      { key: "backgroundElevated", label: "Fondo elevado", description: "Base para capas internas, paneles y elementos por encima del fondo." },
      { key: "paper", label: "Superficie clara", description: "Color claro para cards, paneles o zonas tipo papel." },
      { key: "paperMuted", label: "Superficie clara suave", description: "Version menos intensa de la superficie clara para apoyos visuales." },
      { key: "text", label: "Texto general", description: "Color de lectura normal para parrafos y contenido corrido." },
      { key: "textMuted", label: "Texto secundario", description: "Ayudas visuales, placeholders y textos de menor jerarquia." },
      { key: "textStrong", label: "Titulos y destacados", description: "Titulares, precios y texto de alto contraste." },
      { key: "border", label: "Borde suave", description: "Contornos discretos, divisores e inputs normales." },
      { key: "borderStrong", label: "Borde fuerte", description: "Estados activos, focos y separaciones con mas presencia." },
      { key: "accent", label: "Color principal de accion", description: "Links, botones y acciones importantes." },
      { key: "accentStrong", label: "Color de accion intenso", description: "Hovers, botones fuertes y variantes mas profundas del acento." },
      { key: "accentContrast", label: "Texto sobre acentos", description: "Texto e iconos que van encima del color de accion." },
    ],
  },
  {
    id: "storefront",
    title: "Tienda Publica",
    description: "Controles principales del storefront. El resto de superficies se calcula automaticamente a partir de estos colores.",
    fields: [
      { key: "pageShellBg", label: "Fondo interno de paginas", description: "Base del contenido interno de paginas como login, carrito y producto.", autoSourceLabel: "Automatico desde Fondo base del sitio", advanced: true },
      { key: "storeShellBg", label: "Fondo exterior de la tienda", description: "Color de fondo total detras del contenido de la tienda.", autoSourceLabel: "Automatico desde Fondo base del sitio" },
      { key: "pagePanelBg", label: "Paneles principales", description: "Cards y paneles principales del storefront.", autoSourceLabel: "Automatico desde Fondo secundario" },
      { key: "pagePanelStrongBg", label: "Paneles destacados", description: "Paneles internos o zonas con un poco mas de contraste.", autoSourceLabel: "Automatico desde Fondo elevado" },
      { key: "mutedFieldBg", label: "Campos e inputs", description: "Inputs, selects y campos de formularios del storefront.", autoSourceLabel: "Automatico desde Fondo elevado", advanced: true },
      { key: "blockCardBg", label: "Cards de bloques y productos", description: "Tarjetas del storefront como productos y bloques.", autoSourceLabel: "Automatico desde Paneles principales" },
      { key: "blockPanelBg", label: "Paneles internos de bloques", description: "Paneles secundarios dentro de bloques o modulos.", autoSourceLabel: "Automatico desde Paneles destacados", advanced: true },
      { key: "testimonialCardBg", label: "Tarjetas de testimonios", description: "Fondo normal de las cards de testimonios.", autoSourceLabel: "Automatico desde Paneles principales", advanced: true },
      { key: "testimonialCardFeaturedBg", label: "Testimonio destacado", description: "Version resaltada de la card de testimonios.", autoSourceLabel: "Automatico desde Paneles destacados", advanced: true },
      { key: "newsletterShellBg", label: "Bloque de newsletter", description: "Fondo del modulo de suscripcion o newsletter.", autoSourceLabel: "Automatico desde Paneles destacados" },
    ],
  },
  {
    id: "workspace",
    title: "Panel Interno",
    description: "Controles principales del panel interno. Los estados secundarios siguen esta misma paleta automaticamente.",
    fields: [
      { key: "accountShellBg", label: "Fondo del workspace", description: "Fondo general del panel interno y areas operativas.", autoSourceLabel: "Automatico desde Fondo base del sitio" },
      { key: "accountSidebarBg", label: "Sidebar del workspace", description: "Fondo de la columna lateral del panel.", autoSourceLabel: "Automatico desde Paneles principales" },
      { key: "accountGroupBg", label: "Grupos del workspace", description: "Contenedores y agrupadores dentro del panel.", autoSourceLabel: "Automatico desde Paneles destacados", advanced: true },
      { key: "accountItemBg", label: "Cards e items del workspace", description: "Tarjetas, filas y modulos base del panel.", autoSourceLabel: "Automatico desde Paneles principales" },
      { key: "accountItemBgActive", label: "Item activo o seleccionado", description: "Estado activo para cards, tabs o items seleccionados.", autoSourceLabel: "Automatico desde Paneles destacados" },
      { key: "accountItemBorder", label: "Borde del workspace", description: "Borde normal de cards, grupos e items internos.", autoSourceLabel: "Automatico desde Borde suave" },
      { key: "accountItemBorderActive", label: "Borde activo del workspace", description: "Borde para seleccion, foco o estado activo.", autoSourceLabel: "Automatico desde Borde fuerte", advanced: true },
    ],
  },
];

const themePalettePresets: Array<{
  id: string;
  label: string;
  description: string;
  palette: ThemePalette;
}> = [
  {
    id: "graphite",
    label: "Graphite",
    description: "Oscuro sobrio con acento arena.",
    palette: {
      background: "rgb(13, 15, 19)",
      backgroundSoft: "rgb(22, 25, 31)",
      backgroundElevated: "rgb(31, 35, 43)",
      paper: "rgb(238, 230, 220)",
      paperMuted: "rgb(188, 177, 164)",
      text: "rgb(235, 230, 224)",
      textMuted: "rgb(177, 168, 160)",
      textStrong: "rgb(255, 250, 246)",
      border: "rgb(71, 76, 86)",
      borderStrong: "rgb(106, 113, 126)",
      accent: "rgb(185, 147, 104)",
      accentStrong: "rgb(148, 110, 72)",
      accentContrast: "rgb(255, 248, 241)",
      storeShellBg: "rgb(13, 15, 19)",
      pagePanelBg: "rgb(22, 25, 31)",
      pagePanelStrongBg: "rgb(31, 35, 43)",
      blockCardBg: "rgb(26, 29, 35)",
      newsletterShellBg: "rgb(34, 38, 47)",
      accountShellBg: "rgb(13, 15, 19)",
      accountSidebarBg: "rgb(22, 25, 31)",
      accountItemBg: "rgb(22, 25, 31)",
      accountItemBgActive: "rgb(31, 35, 43)",
      accountItemBorder: "rgb(71, 76, 86)",
    },
  },
  {
    id: "linen",
    label: "Linen",
    description: "Claro y calido para una tienda suave.",
    palette: {
      background: "rgb(248, 243, 238)",
      backgroundSoft: "rgb(255, 250, 246)",
      backgroundElevated: "rgb(244, 235, 227)",
      paper: "rgb(255, 255, 252)",
      paperMuted: "rgb(229, 214, 201)",
      text: "rgb(103, 79, 64)",
      textMuted: "rgb(146, 121, 103)",
      textStrong: "rgb(84, 63, 50)",
      border: "rgb(220, 203, 190)",
      borderStrong: "rgb(188, 165, 148)",
      accent: "rgb(180, 127, 88)",
      accentStrong: "rgb(145, 95, 59)",
      accentContrast: "rgb(255, 250, 245)",
      storeShellBg: "rgb(248, 243, 238)",
      pagePanelBg: "rgb(255, 250, 246)",
      pagePanelStrongBg: "rgb(244, 235, 227)",
      blockCardBg: "rgb(255, 252, 249)",
      newsletterShellBg: "rgb(241, 231, 222)",
      accountShellBg: "rgb(248, 243, 238)",
      accountSidebarBg: "rgb(255, 252, 248)",
      accountItemBg: "rgb(255, 252, 248)",
      accountItemBgActive: "rgb(244, 235, 227)",
      accountItemBorder: "rgb(220, 203, 190)",
    },
  },
  {
    id: "rose-paper",
    label: "Rose Paper",
    description: "Claro editorial con rose y paper.",
    palette: {
      background: "rgb(252, 244, 247)",
      backgroundSoft: "rgb(255, 250, 252)",
      backgroundElevated: "rgb(244, 226, 233)",
      paper: "rgb(255, 255, 255)",
      paperMuted: "rgb(238, 204, 217)",
      text: "rgb(101, 66, 82)",
      textMuted: "rgb(149, 110, 126)",
      textStrong: "rgb(92, 57, 73)",
      border: "rgb(228, 197, 209)",
      borderStrong: "rgb(191, 151, 167)",
      accent: "rgb(186, 110, 140)",
      accentStrong: "rgb(154, 78, 109)",
      accentContrast: "rgb(255, 248, 251)",
      storeShellBg: "rgb(252, 244, 247)",
      pagePanelBg: "rgb(255, 250, 252)",
      pagePanelStrongBg: "rgb(244, 226, 233)",
      blockCardBg: "rgb(255, 253, 254)",
      newsletterShellBg: "rgb(247, 232, 238)",
      accountShellBg: "rgb(252, 244, 247)",
      accountSidebarBg: "rgb(255, 252, 253)",
      accountItemBg: "rgb(255, 252, 253)",
      accountItemBgActive: "rgb(244, 226, 233)",
      accountItemBorder: "rgb(228, 197, 209)",
    },
  },
  {
    id: "ocean-ink",
    label: "Ocean Ink",
    description: "Oscuro frio con acento celeste.",
    palette: {
      background: "rgb(10, 18, 26)",
      backgroundSoft: "rgb(16, 28, 39)",
      backgroundElevated: "rgb(23, 39, 53)",
      paper: "rgb(232, 242, 247)",
      paperMuted: "rgb(151, 182, 197)",
      text: "rgb(221, 234, 241)",
      textMuted: "rgb(148, 177, 191)",
      textStrong: "rgb(244, 250, 252)",
      border: "rgb(55, 83, 99)",
      borderStrong: "rgb(82, 116, 136)",
      accent: "rgb(88, 170, 197)",
      accentStrong: "rgb(55, 132, 160)",
      accentContrast: "rgb(244, 252, 255)",
      storeShellBg: "rgb(10, 18, 26)",
      pagePanelBg: "rgb(16, 28, 39)",
      pagePanelStrongBg: "rgb(23, 39, 53)",
      blockCardBg: "rgb(18, 31, 43)",
      newsletterShellBg: "rgb(27, 45, 60)",
      accountShellBg: "rgb(10, 18, 26)",
      accountSidebarBg: "rgb(16, 28, 39)",
      accountItemBg: "rgb(16, 28, 39)",
      accountItemBgActive: "rgb(23, 39, 53)",
      accountItemBorder: "rgb(55, 83, 99)",
    },
  },
];

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

const blockFieldMap: Record<string, FieldDefinition[]> = {
  hero: [
    { key: "title", label: "Titulo", type: "text" },
    { key: "subtitle", label: "Subtitulo", type: "textarea" },
    { key: "buttonText", label: "Texto del boton", type: "text" },
    { key: "buttonLink", label: "Link del boton", type: "text" },
    { key: "image", label: "Imagen de fondo", type: "image" },
    { key: "backgroundColor", label: "Color de fondo", type: "color" },
    { key: "textColor", label: "Color de texto", type: "text" },
    { key: "animationPreset", label: "Animacion", type: "select", options: animationOptions },
  ],
  hero_carousel: [
    { key: "buttonText", label: "Texto del boton", type: "text" },
    { key: "buttonLink", label: "Link del boton", type: "text" },
    { key: "animationPreset", label: "Animacion", type: "select", options: animationOptions },
  ],
  boutique_hero: [
    { key: "eyebrow", label: "Eyebrow", type: "text" },
    { key: "title", label: "Titulo", type: "text" },
    { key: "subtitle", label: "Subtitulo", type: "textarea" },
    { key: "buttonText", label: "Texto del boton", type: "text" },
    { key: "buttonLink", label: "Link del boton", type: "text" },
    { key: "logo", label: "Logo", type: "image" },
    { key: "image", label: "Imagen principal", type: "image" },
  ],
  product_grid: [
    { key: "title", label: "Titulo", type: "text" },
    { key: "eyebrow", label: "Eyebrow", type: "text" },
    { key: "editorialLabel", label: "Label editorial", type: "text" },
    { key: "editorialTitle", label: "Titulo editorial", type: "text" },
    { key: "category", label: "Categoria (slug)", type: "select", options: [] },
    { key: "limit", label: "Limite", type: "number" },
    { key: "columns", label: "Columnas", type: "number" },
    { key: "productIds", label: "Productos curados", type: "products" },
    { key: "animationPreset", label: "Animacion", type: "select", options: animationOptions },
  ],
  carousel: [
    { key: "title", label: "Titulo", type: "text" },
    { key: "limit", label: "Limite", type: "number" },
    { key: "productIds", label: "Productos curados", type: "products" },
    { key: "animationPreset", label: "Animacion", type: "select", options: animationOptions },
  ],
  featured_products: [
    { key: "title", label: "Titulo", type: "text" },
    { key: "limit", label: "Limite", type: "number" },
    { key: "columns", label: "Columnas", type: "number" },
    { key: "productIds", label: "Productos curados", type: "products" },
    { key: "animationPreset", label: "Animacion", type: "select", options: animationOptions },
  ],
  category_grid: [
    { key: "title", label: "Titulo", type: "text" },
    { key: "columns", label: "Columnas", type: "number" },
    { key: "animationPreset", label: "Animacion", type: "select", options: animationOptions },
  ],
  category_image_strip: [
    { key: "animationPreset", label: "Animacion", type: "select", options: animationOptions },
  ],
  newsletter: [
    { key: "title", label: "Titulo", type: "text" },
    { key: "subtitle", label: "Subtitulo", type: "textarea" },
    { key: "animationPreset", label: "Animacion", type: "select", options: animationOptions },
  ],
  banner: [
    { key: "text", label: "Texto", type: "textarea" },
    { key: "image", label: "Imagen de fondo", type: "image" },
    { key: "backgroundColor", label: "Color de fondo", type: "color" },
    { key: "textColor", label: "Color de texto", type: "color" },
    { key: "animationPreset", label: "Animacion", type: "select", options: animationOptions },
  ],
  testimonials: [
    { key: "animationPreset", label: "Animacion", type: "select", options: animationOptions },
  ],
  benefits: [
    { key: "title", label: "Titulo", type: "text" },
    { key: "eyebrow", label: "Eyebrow", type: "text" },
    { key: "styleVariant", label: "Estilo", type: "select", options: benefitsStyleOptions },
    { key: "animationPreset", label: "Animacion", type: "select", options: animationOptions },
  ],
};

const availableBlockTypes = [
  "hero_carousel",
  "boutique_hero",
  "banner",
  "featured_products",
  "product_grid",
  "category_grid",
  "category_image_strip",
  "carousel",
  "benefits",
  "testimonials",
  "newsletter",
] as const;

const blockDefaultProps: Record<string, Record<string, unknown>> = {
  hero: {
    title: "Nueva coleccion",
    subtitle: "Texturas suaves, capas livianas y productos curados para renovar la tienda.",
    buttonText: "Ver productos",
    buttonLink: "/product",
  },
  hero_carousel: {
    slides: [
      {
        image: "",
        responsiveImage: "",
        eyebrow: "Nuevo bloque",
        title: "Titulo del slide",
        subtitle: "Subtitulo del slide",
      },
    ],
    buttonText: "Ver productos",
    buttonLink: "/product",
    showContentCard: true,
    animationPreset: "soft",
  },
  boutique_hero: {
    eyebrow: "Boutique edit",
    title: "Elegancia para todos los dias",
    subtitle: "Una propuesta visual lista para personalizar desde el panel.",
    buttonText: "Ver coleccion",
    buttonLink: "/product",
    logo: "",
    image: "",
  },
  banner: {
    text: "Anuncio destacado para la tienda",
    backgroundColor: "#f3ede5",
    textColor: "#6f5336",
    animationPreset: "soft",
  },
  featured_products: {
    title: "Productos destacados",
    limit: 6,
    columns: 3,
    productIds: [],
    animationPreset: "soft",
  },
  product_grid: {
    title: "Nuevos ingresos",
    eyebrow: "Curado para tu tienda",
    editorialLabel: "Edit select",
    editorialTitle: "Un bloque listo para destacar productos y narrativa visual",
    category: "",
    limit: 8,
    columns: 4,
    productIds: [],
    animationPreset: "soft",
  },
  category_grid: {
    title: "Categorias",
    columns: 3,
    carousel: false,
    animationPreset: "soft",
  },
  category_image_strip: {
    items: [{ title: "", image: "", categorySlugs: [] }],
    animationPreset: "soft",
  },
  carousel: {
    title: "Carrusel de productos",
    limit: 8,
    productIds: [],
    animationPreset: "soft",
  },
  benefits: {
    title: "",
    eyebrow: "",
    styleVariant: "cards",
    items: [
      {
        title: "Compra segura",
        description: "Procesos simples y pagos cuidados para comprar con confianza.",
        icon: "shield",
        iconImage: "",
      },
      {
        title: "Envios a todo el pais",
        description: "Recibi tus prendas donde estes, con seguimiento de tu pedido.",
        icon: "truck",
        iconImage: "",
      },
      {
        title: "Atencion personalizada",
        description: "Te acompanamos para elegir talles, looks y combinaciones.",
        icon: "heart",
        iconImage: "",
      },
      {
        title: "Novedades constantes",
        description: "Ingresos nuevos y seleccion curada durante toda la temporada.",
        icon: "spark",
        iconImage: "",
      },
    ],
  },
  testimonials: {
    animationPreset: "soft",
  },
  newsletter: {
    title: "Suscribite al newsletter",
    subtitle: "Enterate primero de novedades, ingresos y promociones.",
    animationPreset: "soft",
  },
};

function cloneBlockProps<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function createDefaultBlock(blockType: string, themeName?: string): Block {
  const baseProps = cloneBlockProps(blockDefaultProps[blockType] ?? {});
  const themeProps = cloneBlockProps(
    (themeName ? blockThemeOverrides[themeName]?.[blockType]?.defaultProps : undefined) ?? {},
  );

  return {
    type: blockType,
    props: {
      ...baseProps,
      ...themeProps,
    },
  };
}

function mergeStorefrontConfig(user: User, remoteConfig?: StorefrontConfig | null): StorefrontConfig | null {
  const fallback = user.storeId ? getDefaultStorefrontConfig(user.storeId) : null;

  if (!fallback && !remoteConfig) {
    return null;
  }

  return {
    theme: remoteConfig?.theme || fallback?.theme,
    themePalette: remoteConfig?.themePalette ?? fallback?.themePalette,
    themeLayout: mergeThemeLayout(
      remoteConfig?.theme || fallback?.theme,
      remoteConfig?.themeLayout,
    ),
    pages: {
      home:
        Array.isArray(remoteConfig?.pages?.home) && remoteConfig.pages.home.length > 0
          ? remoteConfig.pages.home
          : fallback?.pages.home ?? [],
    },
  };
}

function clampRgbChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseColorToRgb(value: string): RgbColor | null {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const shortHexMatch = normalized.match(/^#([0-9a-f]{3})$/i);
  if (shortHexMatch) {
    const [r, g, b] = shortHexMatch[1].split("");
    return {
      r: parseInt(`${r}${r}`, 16),
      g: parseInt(`${g}${g}`, 16),
      b: parseInt(`${b}${b}`, 16),
    };
  }

  const hexMatch = normalized.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    return {
      r: parseInt(hexMatch[1].slice(0, 2), 16),
      g: parseInt(hexMatch[1].slice(2, 4), 16),
      b: parseInt(hexMatch[1].slice(4, 6), 16),
    };
  }

  const rgbMatch = normalized.match(
    /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})(?:\s*[,/]\s*[\d.]+)?\s*\)$/i,
  );
  if (rgbMatch) {
    return {
      r: clampRgbChannel(Number(rgbMatch[1])),
      g: clampRgbChannel(Number(rgbMatch[2])),
      b: clampRgbChannel(Number(rgbMatch[3])),
    };
  }

  return null;
}

function formatRgbColor(color: RgbColor) {
  return `rgb(${clampRgbChannel(color.r)}, ${clampRgbChannel(color.g)}, ${clampRgbChannel(color.b)})`;
}

function buildThemePaletteDefaults(baseColors: Partial<Record<ThemePaletteKey, string>>): Partial<Record<ThemePaletteKey, string>> {
  const background = baseColors.background ?? "";
  const backgroundSoft = baseColors.backgroundSoft ?? background;
  const backgroundElevated = baseColors.backgroundElevated ?? backgroundSoft;
  const paperMuted = baseColors.paperMuted ?? baseColors.paper ?? backgroundElevated;
  const border = baseColors.border ?? "";
  const borderStrong = baseColors.borderStrong ?? border;
  const pagePanelBg = backgroundSoft;
  const pagePanelStrongBg = backgroundElevated;

  return {
    ...baseColors,
    pageShellBg: background,
    storeShellBg: background,
    pagePanelBg,
    pagePanelStrongBg,
    mutedFieldBg: backgroundElevated,
    blockCardBg: pagePanelBg,
    blockPanelBg: pagePanelStrongBg,
    testimonialCardBg: pagePanelBg,
    testimonialCardFeaturedBg: pagePanelStrongBg || paperMuted,
    newsletterShellBg: pagePanelStrongBg,
    accountShellBg: background,
    accountSidebarBg: pagePanelBg,
    accountGroupBg: pagePanelStrongBg,
    accountItemBg: pagePanelBg,
    accountItemBgActive: pagePanelStrongBg || paperMuted,
    accountItemBorder: border,
    accountItemBorderActive: borderStrong,
  };
}

function scopeCategoriesToStore(items: Category[], storeId?: number | null) {
  const activeStoreId =
    storeId ??
    (() => {
      try {
        return getClientStoreId();
      } catch {
        return null;
      }
    })();

  if (!activeStoreId) {
    return items;
  }

  const scoped = items.filter((item) => item.storeId === activeStoreId);
  return scoped.length > 0 ? scoped : items;
}

export default function DeveloperModePanel({
  user,
  forceExpanded = false,
}: {
  user: User;
  forceExpanded?: boolean;
}) {
  const { isTabletOrSmaller } = useViewportFlags();
  const panelRef = useRef<HTMLElement | null>(null);
  const [expanded, setExpanded] = useState(forceExpanded);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [config, setConfig] = useState<StorefrontConfig | null>(null);
  const [activeSection, setActiveSection] = useState<"blocks" | "theme" | "integrations">("blocks");
  const [activeThemeGroup, setActiveThemeGroup] = useState<"base" | "storefront" | "workspace">("base");
  const [showAdvancedThemeOptions, setShowAdvancedThemeOptions] = useState(false);
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [mercadoPagoConfig, setMercadoPagoConfig] = useState<AdminMercadoPagoConfig>({
    publicKey: "",
    accessToken: "",
    webhookSecret: "",
    bankTransferDiscountPercentage: "0",
    accessTokenConfigured: false,
    webhookSecretConfigured: false,
    accessTokenPreview: null,
    webhookSecretPreview: null,
  });
  const [mercadoPagoTestResult, setMercadoPagoTestResult] = useState<MercadoPagoTestResult | null>(null);
  const [correoArgentinoConfig, setCorreoArgentinoConfig] = useState<AdminCorreoArgentinoConfig>({
    enabled: false,
    isDefault: true,
    senderName: "",
    senderPhone: "",
    senderEmail: "",
    companyName: "",
    originAddress: {
      streetName: "",
      streetNumber: "",
      floor: "",
      apartment: "",
      city: "",
      state: "",
      provinceCode: "",
      postalCode: "",
    },
    defaultAgency: "",
    deliveryTypes: ["D"],
    defaultPackageDimensions: {
      weightGrams: "300",
      height: "10",
      width: "10",
      length: "10",
    },
    packagingMarginPercent: "8",
    extraEstimatedDays: "5",
    pricing: {
      markupType: "percentage",
      markupValue: "0",
      roundToNearestHundred: true,
    },
    rules: {
      allowHomeDelivery: true,
      allowBranchDelivery: false,
      requireBranchSelection: false,
    },
    flags: {
      autoTrackingEnabled: true,
    },
    global: {
      mode: "MICORREO",
      apiBaseUrl: "",
      apiUsernameConfigured: false,
      apiPasswordConfigured: false,
      customerIdConfigured: false,
      customerEmailConfigured: false,
      customerPasswordConfigured: false,
    },
  });
  const [correoArgentinoTestResult, setCorreoArgentinoTestResult] = useState<CorreoArgentinoTestResult | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [newBlockType, setNewBlockType] = useState<string>(availableBlockTypes[0]);
  const [blockContextMenu, setBlockContextMenu] = useState<BlockContextMenuState>(null);
  const [savedConfigSnapshot, setSavedConfigSnapshot] = useState("");
  const [savedMercadoPagoSnapshot, setSavedMercadoPagoSnapshot] = useState("");
  const [savedCorreoArgentinoSnapshot, setSavedCorreoArgentinoSnapshot] = useState("");

  useEffect(() => {
    if (!expanded) {
      return;
    }

    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [storefrontResponse, productsResponse, categoriesResponse, integrationsResponse] = await Promise.all([
          api("/store/admin/config"),
          api("/products"),
          api("/categories"),
          api("/store/admin/integrations"),
        ]);

        if (!active) {
          return;
        }

        setConfig(mergeStorefrontConfig(user, storefrontResponse?.storefrontConfig));
        setSavedConfigSnapshot(JSON.stringify(mergeStorefrontConfig(user, storefrontResponse?.storefrontConfig) ?? null));
        setProducts(Array.isArray(productsResponse) ? productsResponse : []);
        setCategories(
          Array.isArray(categoriesResponse)
            ? scopeCategoriesToStore(categoriesResponse as Category[], user.storeId)
            : [],
        );
        setMercadoPagoConfig({
          publicKey: String(integrationsResponse?.mercadopago?.publicKey ?? ""),
          accessToken: "",
          webhookSecret: "",
          bankTransferDiscountPercentage: String(
            Number(integrationsResponse?.bankTransfer?.discountPercentage ?? 0),
          ),
          accessTokenConfigured: Boolean(integrationsResponse?.mercadopago?.accessTokenConfigured),
          webhookSecretConfigured: Boolean(integrationsResponse?.mercadopago?.webhookSecretConfigured),
          accessTokenPreview: typeof integrationsResponse?.mercadopago?.accessTokenPreview === "string"
            ? integrationsResponse.mercadopago.accessTokenPreview
            : null,
          webhookSecretPreview: typeof integrationsResponse?.mercadopago?.webhookSecretPreview === "string"
            ? integrationsResponse.mercadopago.webhookSecretPreview
            : null,
        });
        setCorreoArgentinoConfig({
          enabled: Boolean(integrationsResponse?.correoArgentino?.enabled),
          isDefault: integrationsResponse?.correoArgentino?.isDefault !== false,
          senderName: String(integrationsResponse?.correoArgentino?.senderName ?? ""),
          senderPhone: String(integrationsResponse?.correoArgentino?.senderPhone ?? ""),
          senderEmail: String(integrationsResponse?.correoArgentino?.senderEmail ?? ""),
          companyName: String(integrationsResponse?.correoArgentino?.companyName ?? ""),
          originAddress: {
            streetName: String(integrationsResponse?.correoArgentino?.originAddress?.streetName ?? ""),
            streetNumber: String(integrationsResponse?.correoArgentino?.originAddress?.streetNumber ?? ""),
            floor: String(integrationsResponse?.correoArgentino?.originAddress?.floor ?? ""),
            apartment: String(integrationsResponse?.correoArgentino?.originAddress?.apartment ?? ""),
            city: String(integrationsResponse?.correoArgentino?.originAddress?.city ?? ""),
            state: String(integrationsResponse?.correoArgentino?.originAddress?.state ?? ""),
            provinceCode: String(integrationsResponse?.correoArgentino?.originAddress?.provinceCode ?? ""),
            postalCode: String(integrationsResponse?.correoArgentino?.originAddress?.postalCode ?? ""),
          },
          defaultAgency: String(integrationsResponse?.correoArgentino?.defaultAgency ?? ""),
          deliveryTypes: Array.isArray(integrationsResponse?.correoArgentino?.deliveryTypes)
            ? integrationsResponse.correoArgentino.deliveryTypes.map((value: unknown) => String(value))
            : ["D"],
          defaultPackageDimensions: {
            weightGrams: String(Number(integrationsResponse?.correoArgentino?.defaultPackageDimensions?.weightGrams ?? 300)),
            height: String(Number(integrationsResponse?.correoArgentino?.defaultPackageDimensions?.height ?? 10)),
            width: String(Number(integrationsResponse?.correoArgentino?.defaultPackageDimensions?.width ?? 10)),
            length: String(Number(integrationsResponse?.correoArgentino?.defaultPackageDimensions?.length ?? 10)),
          },
          packagingMarginPercent: String(Number(integrationsResponse?.correoArgentino?.packagingMarginPercent ?? 8)),
          extraEstimatedDays: String(Number(integrationsResponse?.correoArgentino?.extraEstimatedDays ?? 5)),
          pricing: {
            markupType: String(integrationsResponse?.correoArgentino?.pricing?.markupType ?? "percentage"),
            markupValue: String(Number(integrationsResponse?.correoArgentino?.pricing?.markupValue ?? 0)),
            roundToNearestHundred: integrationsResponse?.correoArgentino?.pricing?.roundToNearestHundred !== false,
          },
          rules: {
            allowHomeDelivery: integrationsResponse?.correoArgentino?.rules?.allowHomeDelivery !== false,
            allowBranchDelivery: Boolean(integrationsResponse?.correoArgentino?.rules?.allowBranchDelivery),
            requireBranchSelection: Boolean(integrationsResponse?.correoArgentino?.rules?.requireBranchSelection),
          },
          flags: {
            autoTrackingEnabled: integrationsResponse?.correoArgentino?.flags?.autoTrackingEnabled !== false,
          },
          global: {
            mode: String(integrationsResponse?.correoArgentino?.global?.mode ?? "MICORREO"),
            apiBaseUrl: String(integrationsResponse?.correoArgentino?.global?.apiBaseUrl ?? ""),
            apiUsernameConfigured: Boolean(integrationsResponse?.correoArgentino?.global?.apiUsernameConfigured),
            apiPasswordConfigured: Boolean(integrationsResponse?.correoArgentino?.global?.apiPasswordConfigured),
            customerIdConfigured: Boolean(integrationsResponse?.correoArgentino?.global?.customerIdConfigured),
            customerEmailConfigured: Boolean(integrationsResponse?.correoArgentino?.global?.customerEmailConfigured),
            customerPasswordConfigured: Boolean(integrationsResponse?.correoArgentino?.global?.customerPasswordConfigured),
          },
        });
        setSavedMercadoPagoSnapshot(
          JSON.stringify({
            publicKey: String(integrationsResponse?.mercadopago?.publicKey ?? ""),
            bankTransferDiscountPercentage: String(
              Number(integrationsResponse?.bankTransfer?.discountPercentage ?? 0),
            ),
            accessTokenConfigured: Boolean(integrationsResponse?.mercadopago?.accessTokenConfigured),
            webhookSecretConfigured: Boolean(integrationsResponse?.mercadopago?.webhookSecretConfigured),
            accessTokenPreview: typeof integrationsResponse?.mercadopago?.accessTokenPreview === "string"
              ? integrationsResponse.mercadopago.accessTokenPreview
              : null,
            webhookSecretPreview: typeof integrationsResponse?.mercadopago?.webhookSecretPreview === "string"
              ? integrationsResponse.mercadopago.webhookSecretPreview
              : null,
          }),
        );
        setSavedCorreoArgentinoSnapshot(
          JSON.stringify({
            enabled: Boolean(integrationsResponse?.correoArgentino?.enabled),
            isDefault: integrationsResponse?.correoArgentino?.isDefault !== false,
            senderName: String(integrationsResponse?.correoArgentino?.senderName ?? ""),
            senderPhone: String(integrationsResponse?.correoArgentino?.senderPhone ?? ""),
            senderEmail: String(integrationsResponse?.correoArgentino?.senderEmail ?? ""),
            companyName: String(integrationsResponse?.correoArgentino?.companyName ?? ""),
            originAddress: {
              streetName: String(integrationsResponse?.correoArgentino?.originAddress?.streetName ?? ""),
              streetNumber: String(integrationsResponse?.correoArgentino?.originAddress?.streetNumber ?? ""),
              floor: String(integrationsResponse?.correoArgentino?.originAddress?.floor ?? ""),
              apartment: String(integrationsResponse?.correoArgentino?.originAddress?.apartment ?? ""),
              city: String(integrationsResponse?.correoArgentino?.originAddress?.city ?? ""),
              state: String(integrationsResponse?.correoArgentino?.originAddress?.state ?? ""),
              provinceCode: String(integrationsResponse?.correoArgentino?.originAddress?.provinceCode ?? ""),
              postalCode: String(integrationsResponse?.correoArgentino?.originAddress?.postalCode ?? ""),
            },
            defaultAgency: String(integrationsResponse?.correoArgentino?.defaultAgency ?? ""),
            deliveryTypes: Array.isArray(integrationsResponse?.correoArgentino?.deliveryTypes)
              ? integrationsResponse.correoArgentino.deliveryTypes.map((value: unknown) => String(value))
              : ["D"],
            defaultPackageDimensions: {
              weightGrams: String(Number(integrationsResponse?.correoArgentino?.defaultPackageDimensions?.weightGrams ?? 300)),
              height: String(Number(integrationsResponse?.correoArgentino?.defaultPackageDimensions?.height ?? 10)),
              width: String(Number(integrationsResponse?.correoArgentino?.defaultPackageDimensions?.width ?? 10)),
              length: String(Number(integrationsResponse?.correoArgentino?.defaultPackageDimensions?.length ?? 10)),
            },
            packagingMarginPercent: String(Number(integrationsResponse?.correoArgentino?.packagingMarginPercent ?? 8)),
            extraEstimatedDays: String(Number(integrationsResponse?.correoArgentino?.extraEstimatedDays ?? 5)),
            pricing: {
              markupType: String(integrationsResponse?.correoArgentino?.pricing?.markupType ?? "percentage"),
              markupValue: String(Number(integrationsResponse?.correoArgentino?.pricing?.markupValue ?? 0)),
              roundToNearestHundred: integrationsResponse?.correoArgentino?.pricing?.roundToNearestHundred !== false,
            },
            rules: {
              allowHomeDelivery: integrationsResponse?.correoArgentino?.rules?.allowHomeDelivery !== false,
              allowBranchDelivery: Boolean(integrationsResponse?.correoArgentino?.rules?.allowBranchDelivery),
              requireBranchSelection: Boolean(integrationsResponse?.correoArgentino?.rules?.requireBranchSelection),
            },
            flags: {
              autoTrackingEnabled: integrationsResponse?.correoArgentino?.flags?.autoTrackingEnabled !== false,
            },
            global: {
              mode: String(integrationsResponse?.correoArgentino?.global?.mode ?? "MICORREO"),
              apiBaseUrl: String(integrationsResponse?.correoArgentino?.global?.apiBaseUrl ?? ""),
              apiUsernameConfigured: Boolean(integrationsResponse?.correoArgentino?.global?.apiUsernameConfigured),
              apiPasswordConfigured: Boolean(integrationsResponse?.correoArgentino?.global?.apiPasswordConfigured),
              customerIdConfigured: Boolean(integrationsResponse?.correoArgentino?.global?.customerIdConfigured),
              customerEmailConfigured: Boolean(integrationsResponse?.correoArgentino?.global?.customerEmailConfigured),
              customerPasswordConfigured: Boolean(integrationsResponse?.correoArgentino?.global?.customerPasswordConfigured),
            },
          }),
        );
        setMercadoPagoTestResult(null);
        setCorreoArgentinoTestResult(null);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : "No se pudo cargar el modo desarrollador.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [expanded, user]);

  const blocks = config?.pages.home ?? [];
  const activeBlock = blocks[activeBlockIndex] ?? null;
  const currentThemeName = config?.theme ?? "";
  const currentThemeDefinition = themes[currentThemeName as keyof typeof themes];
  const defaultThemePalette = useMemo(() => {
    const rawColors =
      currentThemeDefinition?.tokens?.colors && typeof currentThemeDefinition.tokens.colors === "object"
        ? (currentThemeDefinition.tokens.colors as Record<string, unknown>)
        : {};

    const baseDefaults = themePaletteColorKeys.reduce<ThemePalette>((acc, key) => {
      const value = rawColors[key];
      if (typeof value === "string") {
        acc[key] = value;
      }
      return acc;
    }, {});

    return buildThemePaletteDefaults(baseDefaults);
  }, [currentThemeDefinition]);
  const hasUnsavedStorefrontChanges = useMemo(
    () => JSON.stringify(config ?? null) !== savedConfigSnapshot,
    [config, savedConfigSnapshot],
  );
  const hasUnsavedIntegrationChanges = useMemo(
    () =>
      JSON.stringify(mercadoPagoConfig) !== savedMercadoPagoSnapshot ||
      JSON.stringify(correoArgentinoConfig) !== savedCorreoArgentinoSnapshot,
    [
      mercadoPagoConfig,
      savedMercadoPagoSnapshot,
      correoArgentinoConfig,
      savedCorreoArgentinoSnapshot,
    ],
  );
  const hasUnsavedChanges =
    activeSection === "integrations" ? hasUnsavedIntegrationChanges : hasUnsavedStorefrontChanges;
  const visibleThemePaletteGroups = useMemo(
    () =>
      themePaletteGroups.map((group) => ({
        ...group,
        fields: group.fields.filter((field) => showAdvancedThemeOptions || !field.advanced),
      })),
    [showAdvancedThemeOptions],
  );
  const currentThemeLayout = useMemo(
    () => mergeThemeLayout(config?.theme, config?.themeLayout),
    [config?.theme, config?.themeLayout],
  );

  useEffect(() => {
    const sectionElement = panelRef.current;
    const themeClassName = currentThemeDefinition?.className;
    const hasThemePreview =
      activeSection === "theme" && Boolean(config?.themePalette && Object.keys(config.themePalette).length > 0);

    if (!sectionElement || !themeClassName || !config || !hasThemePreview) {
      return;
    }

    const themeRoot = sectionElement.closest(`.${themeClassName}`) as HTMLElement | null;
    if (!themeRoot) {
      return;
    }

    const nextThemeStyle = buildThemeStyle(currentThemeDefinition.tokens, config.themePalette);
    const appliedKeys = Object.keys(nextThemeStyle);
    const previousInlineStyles = new Map<string, string>();

    for (const [key, value] of Object.entries(nextThemeStyle)) {
      previousInlineStyles.set(key, themeRoot.style.getPropertyValue(key));
      themeRoot.style.setProperty(key, String(value));
    }

    return () => {
      for (const key of appliedKeys) {
        const previousValue = previousInlineStyles.get(key) ?? "";
        if (previousValue) {
          themeRoot.style.setProperty(key, previousValue);
        } else {
          themeRoot.style.removeProperty(key);
        }
      }
    };
  }, [activeSection, config, currentThemeDefinition]);

  useEffect(() => {
    if (blocks.length === 0) {
      if (activeBlockIndex !== 0) {
        setActiveBlockIndex(0);
      }
      return;
    }

    if (activeBlockIndex > blocks.length - 1) {
      setActiveBlockIndex(blocks.length - 1);
    }
  }, [activeBlockIndex, blocks.length]);

  useEffect(() => {
    if (!blockContextMenu) {
      return;
    }

    const closeMenu = () => setBlockContextMenu(null);

    window.addEventListener("click", closeMenu);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [blockContextMenu]);

  const categoryOptions = useMemo(
    () => [{ label: "Sin filtro de categoria", value: "" }].concat(
      categories.map((category) => ({
        label: `${category.name} (${category.slug})`,
        value: category.slug,
      })),
    ),
    [categories],
  );

  const updateBlockProps = (index: number, nextProps: Record<string, unknown>) => {
    setConfig((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        pages: {
          ...current.pages,
          home: current.pages.home.map((block, blockIndex) =>
            blockIndex === index
              ? {
                  ...block,
                  props: nextProps,
                }
              : block,
          ),
        },
      };
    });
  };

  const updateField = (fieldKey: string, value: unknown) => {
    if (!activeBlock) {
      return;
    }

    updateBlockProps(activeBlockIndex, {
      ...(activeBlock.props ?? {}),
      [fieldKey]: value,
    });
  };

  const updateThemePaletteField = (fieldKey: ThemePaletteKey, value: string) => {
    setConfig((current) => {
      if (!current) {
        return current;
      }

      const nextValue = value.trim();
      const nextPalette = {
        ...(current.themePalette ?? {}),
      };

      if (!nextValue) {
        delete nextPalette[fieldKey];
      } else {
        nextPalette[fieldKey] = nextValue;
      }

      return {
        ...current,
        themePalette: Object.keys(nextPalette).length > 0 ? nextPalette : undefined,
      };
    });
  };

  const updateThemePaletteRgbChannel = (
    fieldKey: ThemePaletteKey,
    channel: keyof RgbColor,
    value: string,
    fallbackColor: string,
  ) => {
    const parsedBase = parseColorToRgb(config?.themePalette?.[fieldKey] ?? "") ?? parseColorToRgb(fallbackColor) ?? {
      r: 0,
      g: 0,
      b: 0,
    };

    const numericValue = Number(value);
    const nextColor = {
      ...parsedBase,
      [channel]: Number.isFinite(numericValue) ? clampRgbChannel(numericValue) : 0,
    };

    updateThemePaletteField(fieldKey, formatRgbColor(nextColor));
  };

  const resetThemePalette = () => {
    setConfig((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        themePalette: undefined,
      };
    });
    setSuccess("");
    setError("");
  };

  const applyThemePreset = (presetPalette: ThemePalette) => {
    setConfig((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        themePalette: { ...presetPalette },
      };
    });
    setSuccess("");
    setError("");
  };

  const updateThemeLayout = (
    updater: (layout: StorefrontThemeLayout) => StorefrontThemeLayout,
  ) => {
    setConfig((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        themeLayout: updater(mergeThemeLayout(current.theme, current.themeLayout)),
      };
    });
    setSuccess("");
    setError("");
  };

  const updateHeaderBrandLabel = (value: string) => {
    updateThemeLayout((layout) => ({
      ...layout,
      header: { ...layout.header, brandLabel: value },
    }));
  };

  const updateHeaderLink = (
    index: number,
    field: "label" | "href",
    value: string,
  ) => {
    updateThemeLayout((layout) => ({
      ...layout,
      header: {
        ...layout.header,
        primaryLinks: (layout.header?.primaryLinks ?? []).map((link, linkIndex) =>
          linkIndex === index ? { ...link, [field]: value } : link,
        ),
      },
    }));
  };

  const addHeaderLink = () => {
    updateThemeLayout((layout) => ({
      ...layout,
      header: {
        ...layout.header,
        primaryLinks: [...(layout.header?.primaryLinks ?? []), { label: "", href: "" }],
      },
    }));
  };

  const removeHeaderLink = (index: number) => {
    updateThemeLayout((layout) => ({
      ...layout,
      header: {
        ...layout.header,
        primaryLinks: (layout.header?.primaryLinks ?? []).filter((_, linkIndex) => linkIndex !== index),
      },
    }));
  };

  const updateFooterField = (
    field: "brandTitle" | "brandSubtitle",
    value: string,
  ) => {
    updateThemeLayout((layout) => ({
      ...layout,
      footer: { ...layout.footer, [field]: value },
    }));
  };

  const updateFooterColumnTitle = (columnIndex: number, value: string) => {
    updateThemeLayout((layout) => ({
      ...layout,
      footer: {
        ...layout.footer,
        columns: (layout.footer?.columns ?? []).map((column, index) =>
          index === columnIndex ? { ...column, title: value } : column,
        ),
      },
    }));
  };

  const updateFooterLink = (
    columnIndex: number,
    linkIndex: number,
    field: "label" | "href",
    value: string,
  ) => {
    updateThemeLayout((layout) => ({
      ...layout,
      footer: {
        ...layout.footer,
        columns: (layout.footer?.columns ?? []).map((column, index) =>
          index === columnIndex
            ? {
                ...column,
                links: column.links.map((link, innerIndex) =>
                  innerIndex === linkIndex ? { ...link, [field]: value } : link,
                ),
              }
            : column,
        ),
      },
    }));
  };

  const addFooterColumn = () => {
    updateThemeLayout((layout) => ({
      ...layout,
      footer: {
        ...layout.footer,
        columns: [...(layout.footer?.columns ?? []), { title: "", links: [{ label: "", href: "" }] }],
      },
    }));
  };

  const removeFooterColumn = (columnIndex: number) => {
    updateThemeLayout((layout) => ({
      ...layout,
      footer: {
        ...layout.footer,
        columns: (layout.footer?.columns ?? []).filter((_, index) => index !== columnIndex),
      },
    }));
  };

  const addFooterLink = (columnIndex: number) => {
    updateThemeLayout((layout) => ({
      ...layout,
      footer: {
        ...layout.footer,
        columns: (layout.footer?.columns ?? []).map((column, index) =>
          index === columnIndex
            ? { ...column, links: [...column.links, { label: "", href: "" }] }
            : column,
        ),
      },
    }));
  };

  const removeFooterLink = (columnIndex: number, linkIndex: number) => {
    updateThemeLayout((layout) => ({
      ...layout,
      footer: {
        ...layout.footer,
        columns: (layout.footer?.columns ?? []).map((column, index) =>
          index === columnIndex
            ? {
                ...column,
                links: column.links.filter((_, innerIndex) => innerIndex !== linkIndex),
              }
            : column,
        ),
      },
    }));
  };

  const toggleProduct = (productId: number) => {
    if (!activeBlock) {
      return;
    }

    const currentIds = Array.isArray(activeBlock.props?.productIds)
      ? (activeBlock.props?.productIds as unknown[])
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0)
      : [];

    const nextIds = currentIds.includes(productId)
      ? currentIds.filter((value) => value !== productId)
      : [...currentIds, productId];

    updateField("productIds", nextIds);
  };

  const updateSlide = (slideIndex: number, fieldKey: string, value: string) => {
    if (!activeBlock) {
      return;
    }

    const slides = Array.isArray(activeBlock.props?.slides)
      ? [...(activeBlock.props?.slides as Array<Record<string, unknown>>)]
      : [];
    const currentSlide = slides[slideIndex] ?? {};
    slides[slideIndex] = {
      ...currentSlide,
      [fieldKey]: value,
    };
    updateField("slides", slides);
  };

  const getCategoryImageStripItems = (): CategoryImageStripItem[] => {
    if (!activeBlock || !Array.isArray(activeBlock.props?.items)) {
      return [];
    }

    return activeBlock.props.items.map((item) =>
      item && typeof item === "object" ? (item as CategoryImageStripItem) : {},
    );
  };

  const updateCategoryImageStripItem = (
    itemIndex: number,
    fieldKey: keyof CategoryImageStripItem,
    value: string | string[],
  ) => {
    if (!activeBlock) {
      return;
    }

    const items = [...getCategoryImageStripItems()];
    const currentItem = items[itemIndex] ?? {};
    items[itemIndex] = {
      ...currentItem,
      [fieldKey]: value,
    };
    updateField("items", items);
  };

  const reorderBlocks = (fromIndex: number, toIndex: number) => {
    if (!config || fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
      return;
    }

    setConfig((current) => {
      if (!current) {
        return current;
      }

      const nextBlocks = [...current.pages.home];
      const [movedBlock] = nextBlocks.splice(fromIndex, 1);

      if (!movedBlock) {
        return current;
      }

      nextBlocks.splice(toIndex, 0, movedBlock);

      return {
        ...current,
        pages: {
          ...current.pages,
          home: nextBlocks,
        },
      };
    });

    setActiveBlockIndex((currentIndex) => {
      if (currentIndex === fromIndex) {
        return toIndex;
      }

      if (fromIndex < currentIndex && currentIndex <= toIndex) {
        return currentIndex - 1;
      }

      if (toIndex <= currentIndex && currentIndex < fromIndex) {
        return currentIndex + 1;
      }

      return currentIndex;
    });
    setDraggedBlockIndex(null);
    setDropTargetIndex(null);
    setBlockContextMenu(null);
  };

  const addBlock = () => {
    if (!config) {
      return;
    }

    const nextBlock = createDefaultBlock(newBlockType, config.theme);
    const insertIndex = activeBlock ? activeBlockIndex + 1 : blocks.length;

    setConfig((current) => {
      if (!current) {
        return current;
      }

      const nextBlocks = [...current.pages.home];
      nextBlocks.splice(insertIndex, 0, nextBlock);

      return {
        ...current,
        pages: {
          ...current.pages,
          home: nextBlocks,
        },
      };
    });

    setActiveBlockIndex(insertIndex);
    setSuccess("");
    setError("");
    setBlockContextMenu(null);
  };

  const removeBlock = (index: number) => {
    setConfig((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        pages: {
          ...current.pages,
          home: current.pages.home.filter((_, blockIndex) => blockIndex !== index),
        },
      };
    });

    setActiveBlockIndex((currentIndex) => {
      if (index === currentIndex) {
        return Math.max(0, currentIndex - 1);
      }

      if (index < currentIndex) {
        return currentIndex - 1;
      }

      return currentIndex;
    });
    setSuccess("");
    setError("");
  };

  const uploadAsset = async (file: File) => {
    const optimizedFile = await optimizeAdminAssetForUpload(file);
    const formData = new FormData();
    formData.append("file", optimizedFile);

    try {
      const response = await api("/store/admin/assets/upload", {
        method: "POST",
        body: formData,
      });
      const uploadedUrl = typeof response?.url === "string" ? response.url : "";

      if (!uploadedUrl) {
        throw new Error("No se recibio la URL del asset subido.");
      }

      return uploadedUrl;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo subir la imagen.";

      if (message.includes("status 413")) {
        throw new Error(
          "La imagen sigue siendo demasiado pesada para el servidor incluso despues de optimizarla. Prueba con una imagen mas liviana.",
        );
      }

      throw error;
    }
  };

  const uploadFieldAsset = async (fieldKey: string, file?: File | null) => {
    if (!file) {
      return;
    }

    try {
      setUploadingKey(`field:${fieldKey}`);
      setError("");
      setSuccess("");
      const uploadedUrl = await uploadAsset(file);
      updateField(fieldKey, uploadedUrl);
      setSuccess("Imagen subida correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploadingKey(null);
    }
  };

  const uploadSlideAsset = async (
    slideIndex: number,
    fieldKey: "image" | "responsiveImage",
    file?: File | null,
  ) => {
    if (!file) {
      return;
    }

    try {
      setUploadingKey(`slide:${slideIndex}:${fieldKey}`);
      setError("");
      setSuccess("");
      const uploadedUrl = await uploadAsset(file);
      updateSlide(slideIndex, fieldKey, uploadedUrl);
      setSuccess(
        fieldKey === "responsiveImage"
          ? "Imagen responsive del slide subida correctamente."
          : "Imagen del slide subida correctamente.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : fieldKey === "responsiveImage"
            ? "No se pudo subir la imagen responsive del slide."
            : "No se pudo subir la imagen del slide.",
      );
    } finally {
      setUploadingKey(null);
    }
  };

  const uploadCategoryImageStripAsset = async (itemIndex: number, file?: File | null) => {
    if (!file) {
      return;
    }

    try {
      setUploadingKey(`category-image-strip:${itemIndex}`);
      setError("");
      setSuccess("");
      const uploadedUrl = await uploadAsset(file);
      updateCategoryImageStripItem(itemIndex, "image", uploadedUrl);
      setSuccess("Imagen de la categoria subida correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen de la categoria.");
    } finally {
      setUploadingKey(null);
    }
  };

  const addSlide = () => {
    if (!activeBlock) {
      return;
    }

    const slides = Array.isArray(activeBlock.props?.slides)
      ? [...(activeBlock.props?.slides as Array<Record<string, unknown>>)]
      : [];
    slides.push({
      image: "",
      responsiveImage: "",
      eyebrow: "",
      title: "",
      subtitle: "",
    });
    updateField("slides", slides);
  };

  const removeSlide = (slideIndex: number) => {
    if (!activeBlock) {
      return;
    }

    const slides = Array.isArray(activeBlock.props?.slides)
      ? [...(activeBlock.props?.slides as Array<Record<string, unknown>>)]
      : [];
    updateField(
      "slides",
      slides.filter((_, index) => index !== slideIndex),
    );
  };

  const addCategoryImageStripItem = () => {
    if (!activeBlock) {
      return;
    }

    const items = [...getCategoryImageStripItems()];
    items.push({
      title: "",
      image: "",
      categorySlugs: [],
    });
    updateField("items", items);
  };

  const removeCategoryImageStripItem = (itemIndex: number) => {
    if (!activeBlock) {
      return;
    }

    const items = [...getCategoryImageStripItems()];
    updateField(
      "items",
      items.filter((_, index) => index !== itemIndex),
    );
  };

  const toggleCategoryImageStripCategory = (itemIndex: number, categorySlug: string) => {
    const items = [...getCategoryImageStripItems()];
    const currentItem = items[itemIndex] ?? {};
    const currentSlugs = Array.isArray(currentItem.categorySlugs)
      ? currentItem.categorySlugs.map((slug) => String(slug))
      : [];
    const nextSlugs = currentSlugs.includes(categorySlug)
      ? currentSlugs.filter((slug) => slug !== categorySlug)
      : [...currentSlugs, categorySlug];

    updateCategoryImageStripItem(itemIndex, "categorySlugs", nextSlugs);
  };

  const getBenefitItems = (): BenefitEditorItem[] => {
    if (!activeBlock || !Array.isArray(activeBlock.props?.items)) {
      return [];
    }

    return activeBlock.props.items.map((item) =>
      item && typeof item === "object" ? (item as BenefitEditorItem) : {},
    );
  };

  const updateBenefitItem = (
    itemIndex: number,
    fieldKey: keyof BenefitEditorItem,
    value: string,
  ) => {
    if (!activeBlock) {
      return;
    }

    const items = [...getBenefitItems()];
    const currentItem = items[itemIndex] ?? {};
    items[itemIndex] = {
      ...currentItem,
      [fieldKey]: value,
    };
    updateField("items", items);
  };

  const addBenefitItem = () => {
    if (!activeBlock) {
      return;
    }

    const items = [...getBenefitItems()];
    items.push({
      title: "",
      description: "",
      icon: "shield",
      iconImage: "",
    });
    updateField("items", items);
  };

  const removeBenefitItem = (itemIndex: number) => {
    if (!activeBlock) {
      return;
    }

    const items = [...getBenefitItems()];
    updateField(
      "items",
      items.filter((_, index) => index !== itemIndex),
    );
  };

  const uploadBenefitIconAsset = async (itemIndex: number, file?: File | null) => {
    if (!file) {
      return;
    }

    try {
      setUploadingKey(`benefit-icon:${itemIndex}`);
      setError("");
      setSuccess("");
      const uploadedUrl = await uploadAsset(file);
      updateBenefitItem(itemIndex, "iconImage", uploadedUrl);
      setSuccess("Icono subido correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el icono.");
    } finally {
      setUploadingKey(null);
    }
  };

  const resetToDefaults = () => {
    const fallback = user.storeId ? getDefaultStorefrontConfig(user.storeId) : null;
    if (!fallback) {
      return;
    }

    setConfig({
      theme: fallback.theme,
      themePalette: fallback.themePalette,
      themeLayout: mergeThemeLayout(fallback.theme, fallback.themeLayout),
      pages: {
        home: fallback.pages.home,
      },
    });
    setActiveBlockIndex(0);
    setSuccess("");
    setError("");
  };

  const save = async () => {
    if (activeSection === "integrations") {
      try {
        setSaving(true);
        setError("");
        setSuccess("");
        setMercadoPagoTestResult(null);
        setCorreoArgentinoTestResult(null);

        const payload: {
          publicKey: string;
          accessToken?: string;
          webhookSecret?: string;
        } = {
          publicKey: mercadoPagoConfig.publicKey,
        };

        if (mercadoPagoConfig.accessToken.trim()) {
          payload.accessToken = mercadoPagoConfig.accessToken.trim();
        }

        if (mercadoPagoConfig.webhookSecret.trim()) {
          payload.webhookSecret = mercadoPagoConfig.webhookSecret.trim();
        }

        const response = await api("/store/admin/integrations/mercadopago", {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        const bankTransferResponse = await api("/store/admin/integrations/bank-transfer", {
          method: "PUT",
          body: JSON.stringify({
            discountPercentage: Number(mercadoPagoConfig.bankTransferDiscountPercentage || 0),
          }),
        });
        const correoResponse = await api("/store/admin/integrations/correo-argentino", {
          method: "PUT",
          body: JSON.stringify({
            enabled: correoArgentinoConfig.enabled,
            isDefault: correoArgentinoConfig.isDefault,
            senderName: correoArgentinoConfig.senderName.trim() || null,
            senderPhone: correoArgentinoConfig.senderPhone.trim() || null,
            senderEmail: correoArgentinoConfig.senderEmail.trim() || null,
            companyName: correoArgentinoConfig.companyName.trim() || null,
            metadata: {
              originAddress: {
                streetName: correoArgentinoConfig.originAddress.streetName.trim(),
                streetNumber: correoArgentinoConfig.originAddress.streetNumber.trim(),
                floor: correoArgentinoConfig.originAddress.floor.trim(),
                apartment: correoArgentinoConfig.originAddress.apartment.trim(),
                city: correoArgentinoConfig.originAddress.city.trim(),
                state: correoArgentinoConfig.originAddress.state.trim(),
                provinceCode: correoArgentinoConfig.originAddress.provinceCode.trim(),
                postalCode: correoArgentinoConfig.originAddress.postalCode.trim(),
              },
              defaultAgency: correoArgentinoConfig.defaultAgency.trim(),
              deliveryTypes: correoArgentinoConfig.deliveryTypes,
              defaultPackageDimensions: {
                weightGrams: Number(correoArgentinoConfig.defaultPackageDimensions.weightGrams || 0),
                height: Number(correoArgentinoConfig.defaultPackageDimensions.height || 0),
                width: Number(correoArgentinoConfig.defaultPackageDimensions.width || 0),
                length: Number(correoArgentinoConfig.defaultPackageDimensions.length || 0),
              },
              packagingMarginPercent: Number(correoArgentinoConfig.packagingMarginPercent || 0),
              extraEstimatedDays: Number(correoArgentinoConfig.extraEstimatedDays || 0),
              pricing: {
                markupType: correoArgentinoConfig.pricing.markupType,
                markupValue: Number(correoArgentinoConfig.pricing.markupValue || 0),
                roundToNearestHundred: correoArgentinoConfig.pricing.roundToNearestHundred,
              },
              rules: {
                allowHomeDelivery: correoArgentinoConfig.rules.allowHomeDelivery,
                allowBranchDelivery: correoArgentinoConfig.rules.allowBranchDelivery,
                requireBranchSelection: correoArgentinoConfig.rules.requireBranchSelection,
              },
              flags: {
                autoTrackingEnabled: correoArgentinoConfig.flags.autoTrackingEnabled,
              },
            },
          }),
        });

        setMercadoPagoConfig({
          publicKey: String(response?.mercadopago?.publicKey ?? ""),
          accessToken: "",
          webhookSecret: "",
          bankTransferDiscountPercentage: String(
            Number(bankTransferResponse?.bankTransfer?.discountPercentage ?? 0),
          ),
          accessTokenConfigured: Boolean(response?.mercadopago?.accessTokenConfigured),
          webhookSecretConfigured: Boolean(response?.mercadopago?.webhookSecretConfigured),
          accessTokenPreview: typeof response?.mercadopago?.accessTokenPreview === "string"
            ? response.mercadopago.accessTokenPreview
            : null,
          webhookSecretPreview: typeof response?.mercadopago?.webhookSecretPreview === "string"
            ? response.mercadopago.webhookSecretPreview
            : null,
        });
        setCorreoArgentinoConfig({
          enabled: Boolean(correoResponse?.correoArgentino?.enabled),
          isDefault: correoResponse?.correoArgentino?.isDefault !== false,
          senderName: String(correoResponse?.correoArgentino?.senderName ?? ""),
          senderPhone: String(correoResponse?.correoArgentino?.senderPhone ?? ""),
          senderEmail: String(correoResponse?.correoArgentino?.senderEmail ?? ""),
          companyName: String(correoResponse?.correoArgentino?.companyName ?? ""),
          originAddress: {
            streetName: String(correoResponse?.correoArgentino?.originAddress?.streetName ?? ""),
            streetNumber: String(correoResponse?.correoArgentino?.originAddress?.streetNumber ?? ""),
            floor: String(correoResponse?.correoArgentino?.originAddress?.floor ?? ""),
            apartment: String(correoResponse?.correoArgentino?.originAddress?.apartment ?? ""),
            city: String(correoResponse?.correoArgentino?.originAddress?.city ?? ""),
            state: String(correoResponse?.correoArgentino?.originAddress?.state ?? ""),
            provinceCode: String(correoResponse?.correoArgentino?.originAddress?.provinceCode ?? ""),
            postalCode: String(correoResponse?.correoArgentino?.originAddress?.postalCode ?? ""),
          },
          defaultAgency: String(correoResponse?.correoArgentino?.defaultAgency ?? ""),
          deliveryTypes: Array.isArray(correoResponse?.correoArgentino?.deliveryTypes)
            ? correoResponse.correoArgentino.deliveryTypes.map((value: unknown) => String(value))
            : ["D"],
          defaultPackageDimensions: {
            weightGrams: String(Number(correoResponse?.correoArgentino?.defaultPackageDimensions?.weightGrams ?? 300)),
            height: String(Number(correoResponse?.correoArgentino?.defaultPackageDimensions?.height ?? 10)),
            width: String(Number(correoResponse?.correoArgentino?.defaultPackageDimensions?.width ?? 10)),
            length: String(Number(correoResponse?.correoArgentino?.defaultPackageDimensions?.length ?? 10)),
          },
          packagingMarginPercent: String(Number(correoResponse?.correoArgentino?.packagingMarginPercent ?? 8)),
          extraEstimatedDays: String(Number(correoResponse?.correoArgentino?.extraEstimatedDays ?? 5)),
          pricing: {
            markupType: String(correoResponse?.correoArgentino?.pricing?.markupType ?? "percentage"),
            markupValue: String(Number(correoResponse?.correoArgentino?.pricing?.markupValue ?? 0)),
            roundToNearestHundred: correoResponse?.correoArgentino?.pricing?.roundToNearestHundred !== false,
          },
          rules: {
            allowHomeDelivery: correoResponse?.correoArgentino?.rules?.allowHomeDelivery !== false,
            allowBranchDelivery: Boolean(correoResponse?.correoArgentino?.rules?.allowBranchDelivery),
            requireBranchSelection: Boolean(correoResponse?.correoArgentino?.rules?.requireBranchSelection),
          },
          flags: {
            autoTrackingEnabled: correoResponse?.correoArgentino?.flags?.autoTrackingEnabled !== false,
          },
          global: {
            mode: String(correoResponse?.correoArgentino?.global?.mode ?? "MICORREO"),
            apiBaseUrl: String(correoResponse?.correoArgentino?.global?.apiBaseUrl ?? ""),
            apiUsernameConfigured: Boolean(correoResponse?.correoArgentino?.global?.apiUsernameConfigured),
            apiPasswordConfigured: Boolean(correoResponse?.correoArgentino?.global?.apiPasswordConfigured),
            customerIdConfigured: Boolean(correoResponse?.correoArgentino?.global?.customerIdConfigured),
            customerEmailConfigured: Boolean(correoResponse?.correoArgentino?.global?.customerEmailConfigured),
            customerPasswordConfigured: Boolean(correoResponse?.correoArgentino?.global?.customerPasswordConfigured),
          },
        });
        setSavedMercadoPagoSnapshot(
          JSON.stringify({
            publicKey: String(response?.mercadopago?.publicKey ?? ""),
            bankTransferDiscountPercentage: String(
              Number(bankTransferResponse?.bankTransfer?.discountPercentage ?? 0),
            ),
            accessTokenConfigured: Boolean(response?.mercadopago?.accessTokenConfigured),
            webhookSecretConfigured: Boolean(response?.mercadopago?.webhookSecretConfigured),
            accessTokenPreview: typeof response?.mercadopago?.accessTokenPreview === "string"
              ? response.mercadopago.accessTokenPreview
              : null,
            webhookSecretPreview: typeof response?.mercadopago?.webhookSecretPreview === "string"
              ? response.mercadopago.webhookSecretPreview
              : null,
          }),
        );
        setSavedCorreoArgentinoSnapshot(
          JSON.stringify({
            enabled: Boolean(correoResponse?.correoArgentino?.enabled),
            isDefault: correoResponse?.correoArgentino?.isDefault !== false,
            senderName: String(correoResponse?.correoArgentino?.senderName ?? ""),
            senderPhone: String(correoResponse?.correoArgentino?.senderPhone ?? ""),
            senderEmail: String(correoResponse?.correoArgentino?.senderEmail ?? ""),
            companyName: String(correoResponse?.correoArgentino?.companyName ?? ""),
            originAddress: {
              streetName: String(correoResponse?.correoArgentino?.originAddress?.streetName ?? ""),
              streetNumber: String(correoResponse?.correoArgentino?.originAddress?.streetNumber ?? ""),
              floor: String(correoResponse?.correoArgentino?.originAddress?.floor ?? ""),
              apartment: String(correoResponse?.correoArgentino?.originAddress?.apartment ?? ""),
              city: String(correoResponse?.correoArgentino?.originAddress?.city ?? ""),
              state: String(correoResponse?.correoArgentino?.originAddress?.state ?? ""),
              provinceCode: String(correoResponse?.correoArgentino?.originAddress?.provinceCode ?? ""),
              postalCode: String(correoResponse?.correoArgentino?.originAddress?.postalCode ?? ""),
            },
            defaultAgency: String(correoResponse?.correoArgentino?.defaultAgency ?? ""),
            deliveryTypes: Array.isArray(correoResponse?.correoArgentino?.deliveryTypes)
              ? correoResponse.correoArgentino.deliveryTypes.map((value: unknown) => String(value))
              : ["D"],
            defaultPackageDimensions: {
              weightGrams: String(Number(correoResponse?.correoArgentino?.defaultPackageDimensions?.weightGrams ?? 300)),
              height: String(Number(correoResponse?.correoArgentino?.defaultPackageDimensions?.height ?? 10)),
              width: String(Number(correoResponse?.correoArgentino?.defaultPackageDimensions?.width ?? 10)),
              length: String(Number(correoResponse?.correoArgentino?.defaultPackageDimensions?.length ?? 10)),
            },
            packagingMarginPercent: String(Number(correoResponse?.correoArgentino?.packagingMarginPercent ?? 8)),
            extraEstimatedDays: String(Number(correoResponse?.correoArgentino?.extraEstimatedDays ?? 5)),
            pricing: {
              markupType: String(correoResponse?.correoArgentino?.pricing?.markupType ?? "percentage"),
              markupValue: String(Number(correoResponse?.correoArgentino?.pricing?.markupValue ?? 0)),
              roundToNearestHundred: correoResponse?.correoArgentino?.pricing?.roundToNearestHundred !== false,
            },
            rules: {
              allowHomeDelivery: correoResponse?.correoArgentino?.rules?.allowHomeDelivery !== false,
              allowBranchDelivery: Boolean(correoResponse?.correoArgentino?.rules?.allowBranchDelivery),
              requireBranchSelection: Boolean(correoResponse?.correoArgentino?.rules?.requireBranchSelection),
            },
            flags: {
              autoTrackingEnabled: correoResponse?.correoArgentino?.flags?.autoTrackingEnabled !== false,
            },
            global: {
              mode: String(correoResponse?.correoArgentino?.global?.mode ?? "MICORREO"),
              apiBaseUrl: String(correoResponse?.correoArgentino?.global?.apiBaseUrl ?? ""),
              apiUsernameConfigured: Boolean(correoResponse?.correoArgentino?.global?.apiUsernameConfigured),
              apiPasswordConfigured: Boolean(correoResponse?.correoArgentino?.global?.apiPasswordConfigured),
              customerIdConfigured: Boolean(correoResponse?.correoArgentino?.global?.customerIdConfigured),
              customerEmailConfigured: Boolean(correoResponse?.correoArgentino?.global?.customerEmailConfigured),
              customerPasswordConfigured: Boolean(correoResponse?.correoArgentino?.global?.customerPasswordConfigured),
            },
          }),
        );
        setSuccess("Las configuraciones de pago se guardaron correctamente.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar la integracion.");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!config) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await api("/store/admin/config", {
        method: "PUT",
        body: JSON.stringify({
          storefrontConfig: config,
        }),
      });

      const mergedConfig = mergeStorefrontConfig(user, response?.storefrontConfig);
      setConfig(mergedConfig);
      setSavedConfigSnapshot(JSON.stringify(mergedConfig ?? null));
      setSuccess("La configuracion de bloques se guardo correctamente.");
      window.setTimeout(() => {
        window.location.reload();
      }, 180);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la configuracion.");
    } finally {
      setSaving(false);
    }
  };

  const testMercadoPago = async () => {
    try {
      setTestingIntegration("mercadopago");
      setError("");
      setSuccess("");
      setMercadoPagoTestResult(null);

      const response = await api("/store/admin/integrations/mercadopago/test", {
        method: "POST",
      });

      setMercadoPagoTestResult(response as MercadoPagoTestResult);
      if (response?.ok) {
        setSuccess(
          typeof response?.message === "string"
            ? response.message
            : "La integracion con Mercado Pago respondio correctamente.",
        );
      } else if (typeof response?.message === "string") {
        setError(response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo probar la integracion.");
    } finally {
      setTestingIntegration(null);
    }
  };

  const testCorreoArgentino = async () => {
    try {
      setTestingIntegration("correo-argentino");
      setError("");
      setSuccess("");
      setCorreoArgentinoTestResult(null);

      const response = await api("/store/admin/integrations/correo-argentino/test", {
        method: "POST",
      });

      setCorreoArgentinoTestResult(response as CorreoArgentinoTestResult);
      if (response?.ok) {
        setSuccess(
          typeof response?.message === "string"
            ? response.message
            : "La integracion con Correo Argentino respondio correctamente.",
        );
      } else if (typeof response?.message === "string") {
        setError(response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo probar la integracion.");
    } finally {
      setTestingIntegration(null);
    }
  };

  return (
    <section ref={panelRef} style={cardStyle}>
      {!forceExpanded ? (
        <div style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>Modo desarrollador</p>
            <h3 style={titleStyle}>Bloques de la tienda</h3>
            <p style={copyStyle}>
              Edita textos, fondos y productos destacados de cada bloque.
            </p>
          </div>
          <button type="button" onClick={() => setExpanded((current) => !current)} style={secondaryButtonStyle}>
            {expanded ? "Cerrar editor" : "Abrir editor"}
          </button>
        </div>
      ) : null}

      {!expanded ? null : (
        <div style={{ display: "grid", gap: 18 }}>
          <div style={sectionTabsStyle}>
            <button
              type="button"
              onClick={() => setActiveSection("blocks")}
              style={sectionTabButtonStyle(activeSection === "blocks")}
            >
              Bloques
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("theme")}
              style={sectionTabButtonStyle(activeSection === "theme")}
            >
              Theme
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("integrations")}
              style={sectionTabButtonStyle(activeSection === "integrations")}
            >
              Integraciones
            </button>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={save}
              disabled={saving || loading || (activeSection !== "integrations" && !config) || !hasUnsavedChanges}
              style={primaryButtonStyle}
            >
              {saving
                ? "Guardando..."
                : activeSection === "integrations"
                  ? "Guardar integracion"
                  : activeSection === "theme"
                    ? "Guardar theme"
                    : "Guardar bloques"}
            </button>
            <div style={saveStatusChipStyle(hasUnsavedChanges)}>
              <strong>{hasUnsavedChanges ? "Cambios sin guardar" : "Todo guardado"}</strong>
              <span>{hasUnsavedChanges ? "Estas viendo preview en vivo" : "Sincronizado con la tienda"}</span>
            </div>
            {activeSection === "integrations" ? null : (
              <button type="button" onClick={resetToDefaults} disabled={saving || loading} style={secondaryButtonStyle}>
                Restaurar defaults
              </button>
            )}
          </div>

          <div style={{ ...developerGridStyle, gridTemplateColumns: isTabletOrSmaller ? "minmax(0, 1fr)" : developerGridStyle.gridTemplateColumns }}>
            {activeSection === "blocks" ? (
              <div style={menuCardStyle}>
                <strong style={{ fontSize: 16, color: "var(--account-text-strong)" }}>
                  Bloques activos
                </strong>
                <p style={{ ...hintStyle, margin: 0 }}>
                  Arrastra para reordenar. Click derecho sobre una card para eliminarla.
                </p>
                <div style={addBlockPanelStyle}>
                  <select
                    value={newBlockType}
                    onChange={(event) => setNewBlockType(event.target.value)}
                    style={inputStyle}
                  >
                    {availableBlockTypes.map((blockType) => (
                      <option key={blockType} value={blockType}>
                        {blockLabels[blockType] ?? blockType}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={addBlock} disabled={!config} style={secondaryButtonStyle}>
                    Agregar bloque
                  </button>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {blocks.map((block, index) => (
                    <div
                      key={`${block.type}-${index}`}
                      draggable
                      onDragStart={() => {
                        setDraggedBlockIndex(index);
                        setDropTargetIndex(index);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (draggedBlockIndex !== null && draggedBlockIndex !== index) {
                          setDropTargetIndex(index);
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggedBlockIndex !== null) {
                          reorderBlocks(draggedBlockIndex, index);
                        }
                      }}
                      onDragEnd={() => {
                        setDraggedBlockIndex(null);
                        setDropTargetIndex(null);
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        setBlockContextMenu({
                          index,
                          x: event.clientX,
                          y: event.clientY,
                        });
                      }}
                      style={blockListItemStyle}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveBlockIndex(index)}
                        style={blockNavStyle(index === activeBlockIndex)}
                      >
                        <strong>{String(index + 1).padStart(2, "0")}</strong>
                        <span>{blockLabels[block.type] ?? block.type}</span>
                        {draggedBlockIndex === index ? (
                          <span style={dragHintStyle}>Moviendo...</span>
                        ) : dropTargetIndex === index && draggedBlockIndex !== null ? (
                          <span style={dragHintStyle}>Soltar aca</span>
                        ) : (
                          <span style={dragHintStyle}>Arrastrar para reordenar</span>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
                {blockContextMenu ? (
                  <div
                    style={{
                      ...contextMenuStyle,
                      left: blockContextMenu.x,
                      top: blockContextMenu.y,
                    }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => removeBlock(blockContextMenu.index)}
                      style={contextMenuDangerButtonStyle}
                    >
                      Eliminar bloque
                    </button>
                  </div>
                ) : null}
              </div>
            ) : activeSection === "theme" ? (
              <div style={menuCardStyle}>
                <strong style={{ fontSize: 16 }}>Theme</strong>
                <div style={{ display: "grid", gap: 10 }}>
                  <button type="button" style={blockNavStyle(true)}>
                    <strong>01</strong>
                    <span>Paleta global</span>
                    <span style={dragHintStyle}>
                      {hasUnsavedStorefrontChanges
                        ? "Tienes cambios sin guardar"
                        : Object.keys(config?.themePalette ?? {}).length > 0
                          ? `${Object.keys(config?.themePalette ?? {}).length} colores personalizados`
                          : "Usando colores por defecto"}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={menuCardStyle}>
                <strong style={{ fontSize: 16 }}>Integraciones</strong>
                <div style={{ display: "grid", gap: 10 }}>
                  <button type="button" style={blockNavStyle(true)}>
                    <strong>01</strong>
                    <span>Mercado Pago</span>
                    <span style={dragHintStyle}>Cobros online y tarjeta</span>
                  </button>
                  <button type="button" style={blockNavStyle(true)}>
                    <strong>02</strong>
                    <span>Correo Argentino</span>
                    <span style={dragHintStyle}>Envios automaticos por tienda</span>
                  </button>
                </div>
              </div>
            )}

            <div style={editorCardStyle}>
              {loading ? (
                <p style={copyStyle}>
                  {activeSection === "blocks"
                    ? "Cargando configuracion de bloques..."
                    : activeSection === "theme"
                      ? "Cargando configuracion del theme..."
                    : "Cargando integraciones..."}
                </p>
              ) : activeSection === "integrations" ? (
                <>
                  <div style={{ display: "grid", gap: 8 }}>
                    <p style={eyebrowStyle}>Integraciones operativas</p>
                    <h4 style={{ margin: 0, fontSize: 24 }}>Cobros y envios</h4>
                    <p style={copyStyle}>
                      Desde aca administras Mercado Pago por tienda y la configuracion operativa de Correo Argentino.
                    </p>
                  </div>

                  <div style={{ display: "grid", gap: 18 }}>
                    <div style={integrationInfoCardStyle}>
                      <div style={{ display: "grid", gap: 6 }}>
                        <p style={eyebrowStyle}>Integracion 01</p>
                        <h5 style={{ margin: 0, fontSize: 20 }}>Mercado Pago</h5>
                        <p style={hintStyle}>
                          Carga las credenciales de esta tienda y valida que la cuenta responda antes de publicar.
                        </p>
                      </div>

                      <div style={{ display: "grid", gap: 14 }}>
                        <div style={{ display: "grid", gap: 8 }}>
                          <label style={labelStyle}>Public key</label>
                          <input
                            type="text"
                            value={mercadoPagoConfig.publicKey}
                            onChange={(event) => {
                              setMercadoPagoConfig((current) => ({
                                ...current,
                                publicKey: event.target.value,
                              }));
                              setMercadoPagoTestResult(null);
                            }}
                            placeholder="APP_USR-..."
                            style={inputStyle}
                          />
                        </div>

                        <div style={{ display: "grid", gap: 8 }}>
                          <label style={labelStyle}>Access token</label>
                          <input
                            type="password"
                            value={mercadoPagoConfig.accessToken}
                            onChange={(event) => {
                              setMercadoPagoConfig((current) => ({
                                ...current,
                                accessToken: event.target.value,
                              }));
                              setMercadoPagoTestResult(null);
                            }}
                            placeholder="APP_USR-..."
                            autoComplete="new-password"
                            style={inputStyle}
                          />
                          {mercadoPagoConfig.accessTokenConfigured && !mercadoPagoConfig.accessToken ? (
                            <p style={hintStyle}>
                              Token ya configurado en backend{mercadoPagoConfig.accessTokenPreview ? ` (${mercadoPagoConfig.accessTokenPreview})` : ""}. Carga uno nuevo solo si queres rotarlo.
                            </p>
                          ) : null}
                        </div>

                        <div style={{ display: "grid", gap: 8 }}>
                          <label style={labelStyle}>Webhook secret</label>
                          <input
                            type="password"
                            value={mercadoPagoConfig.webhookSecret}
                            onChange={(event) => {
                              setMercadoPagoConfig((current) => ({
                                ...current,
                                webhookSecret: event.target.value,
                              }));
                              setMercadoPagoTestResult(null);
                            }}
                            placeholder="Secret del webhook"
                            autoComplete="new-password"
                            style={inputStyle}
                          />
                          {mercadoPagoConfig.webhookSecretConfigured && !mercadoPagoConfig.webhookSecret ? (
                            <p style={hintStyle}>
                              Secret ya configurado{mercadoPagoConfig.webhookSecretPreview ? ` (${mercadoPagoConfig.webhookSecretPreview})` : ""}. Escribi uno nuevo solo si queres reemplazarlo.
                            </p>
                          ) : null}
                        </div>

                        <div style={{ display: "grid", gap: 8 }}>
                          <label style={labelStyle}>Descuento por transferencia (%)</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            value={mercadoPagoConfig.bankTransferDiscountPercentage}
                            onChange={(event) => {
                              setMercadoPagoConfig((current) => ({
                                ...current,
                                bankTransferDiscountPercentage: event.target.value,
                              }));
                            }}
                            placeholder="0"
                            style={inputStyle}
                          />
                          <p style={hintStyle}>
                            Si la tienda quiere incentivar transferencia bancaria, carga aca el porcentaje. Ejemplo: 10.
                          </p>
                        </div>

                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={testMercadoPago}
                            disabled={saving || loading || testingIntegration !== null}
                            style={secondaryButtonStyle}
                          >
                            {testingIntegration === "mercadopago" ? "Probando..." : "Probar integracion"}
                          </button>
                        </div>

                        <div style={integrationInfoCardStyle}>
                          <strong style={{ fontSize: 15 }}>Chequeos rapidos</strong>
                          <div style={{ display: "grid", gap: 8 }}>
                            <div style={integrationCheckStyle(Boolean(mercadoPagoConfig.publicKey))}>
                              <span>Public key</span>
                              <strong>{mercadoPagoConfig.publicKey ? "Cargada" : "Pendiente"}</strong>
                            </div>
                            <div style={integrationCheckStyle(Boolean(mercadoPagoConfig.accessToken || mercadoPagoConfig.accessTokenConfigured))}>
                              <span>Access token</span>
                              <strong>{mercadoPagoConfig.accessToken || mercadoPagoConfig.accessTokenConfigured ? "Cargado" : "Pendiente"}</strong>
                            </div>
                            <div style={integrationCheckStyle(Boolean(mercadoPagoConfig.webhookSecret || mercadoPagoConfig.webhookSecretConfigured))}>
                              <span>Webhook secret</span>
                              <strong>{mercadoPagoConfig.webhookSecret || mercadoPagoConfig.webhookSecretConfigured ? "Cargado" : "Pendiente"}</strong>
                            </div>
                            <div style={integrationCheckStyle(Number(mercadoPagoConfig.bankTransferDiscountPercentage || 0) > 0)}>
                              <span>Descuento transferencia</span>
                              <strong>
                                {Number(mercadoPagoConfig.bankTransferDiscountPercentage || 0) > 0
                                  ? `${Number(mercadoPagoConfig.bankTransferDiscountPercentage)}%`
                                  : "Sin descuento"}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {mercadoPagoTestResult ? (
                          <div
                            style={{
                              ...integrationInfoCardStyle,
                              border: mercadoPagoTestResult!.ok
                                ? "1px solid var(--admin-tone-success-border)"
                                : "1px solid var(--admin-danger-border)",
                            }}
                          >
                            <strong style={{ fontSize: 15 }}>
                              {mercadoPagoTestResult!.ok ? "Test exitoso" : "Test con observaciones"}
                            </strong>
                            {mercadoPagoTestResult!.account ? (
                              <p style={hintStyle}>
                                Cuenta: {mercadoPagoTestResult!.account!.nickname || "Sin alias"}
                                {mercadoPagoTestResult!.account!.email ? ` · ${mercadoPagoTestResult!.account!.email}` : ""}
                              </p>
                            ) : null}
                            {mercadoPagoTestResult!.details ? (
                              <p style={hintStyle}>{mercadoPagoTestResult!.details}</p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div style={integrationInfoCardStyle}>
                      <div style={{ display: "grid", gap: 6 }}>
                        <p style={eyebrowStyle}>Integracion 02</p>
                        <h5 style={{ margin: 0, fontSize: 20 }}>Correo Argentino</h5>
                        <p style={hintStyle}>
                          Las credenciales se administran a nivel plataforma. En esta tienda solo configuras origen,
                          remitente, modalidades y reglas operativas.
                        </p>
                      </div>

                      <div style={{ display: "grid", gap: 14 }}>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          <label style={productChipStyle(correoArgentinoConfig.enabled)}>
                            <input
                              type="checkbox"
                              checked={correoArgentinoConfig.enabled}
                              onChange={(event) => {
                                setCorreoArgentinoConfig((current) => ({
                                  ...current,
                                  enabled: event.target.checked,
                                }));
                                setCorreoArgentinoTestResult(null);
                              }}
                            />
                            <span>Integracion activa</span>
                          </label>
                          <label style={productChipStyle(correoArgentinoConfig.isDefault)}>
                            <input
                              type="checkbox"
                              checked={correoArgentinoConfig.isDefault}
                              onChange={(event) => {
                                setCorreoArgentinoConfig((current) => ({
                                  ...current,
                                  isDefault: event.target.checked,
                                }));
                                setCorreoArgentinoTestResult(null);
                              }}
                            />
                            <span>Provider por defecto</span>
                          </label>
                          <label style={productChipStyle(correoArgentinoConfig.flags.autoTrackingEnabled)}>
                            <input
                              type="checkbox"
                              checked={correoArgentinoConfig.flags.autoTrackingEnabled}
                              onChange={(event) => {
                                setCorreoArgentinoConfig((current) => ({
                                  ...current,
                                  flags: {
                                    ...current.flags,
                                    autoTrackingEnabled: event.target.checked,
                                  },
                                }));
                              }}
                            />
                            <span>Tracking automatico</span>
                          </label>
                        </div>

                        <div style={{ display: "grid", gap: 8 }}>
                          <strong style={{ fontSize: 15 }}>Datos del remitente</strong>
                          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label style={labelStyle}>Sender name</label>
                              <input
                                type="text"
                                value={correoArgentinoConfig.senderName}
                                onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, senderName: event.target.value }))}
                                placeholder="Nombre de remitente"
                                style={inputStyle}
                              />
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label style={labelStyle}>Sender phone</label>
                              <input
                                type="text"
                                value={correoArgentinoConfig.senderPhone}
                                onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, senderPhone: event.target.value }))}
                                placeholder="Telefono"
                                style={inputStyle}
                              />
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label style={labelStyle}>Sender email</label>
                              <input
                                type="email"
                                value={correoArgentinoConfig.senderEmail}
                                onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, senderEmail: event.target.value }))}
                                placeholder="correo@tienda.com"
                                style={inputStyle}
                              />
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label style={labelStyle}>Company name</label>
                              <input
                                type="text"
                                value={correoArgentinoConfig.companyName}
                                onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, companyName: event.target.value }))}
                                placeholder="Nombre comercial"
                                style={inputStyle}
                              />
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "grid", gap: 8 }}>
                          <strong style={{ fontSize: 15 }}>Direccion de origen</strong>
                          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label style={labelStyle}>Calle</label>
                              <input type="text" value={correoArgentinoConfig.originAddress.streetName} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, originAddress: { ...current.originAddress, streetName: event.target.value } }))} style={inputStyle} />
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label style={labelStyle}>Numero</label>
                              <input type="text" value={correoArgentinoConfig.originAddress.streetNumber} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, originAddress: { ...current.originAddress, streetNumber: event.target.value } }))} style={inputStyle} />
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label style={labelStyle}>Piso</label>
                              <input type="text" value={correoArgentinoConfig.originAddress.floor} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, originAddress: { ...current.originAddress, floor: event.target.value } }))} style={inputStyle} />
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label style={labelStyle}>Departamento</label>
                              <input type="text" value={correoArgentinoConfig.originAddress.apartment} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, originAddress: { ...current.originAddress, apartment: event.target.value } }))} style={inputStyle} />
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label style={labelStyle}>Ciudad</label>
                              <input type="text" value={correoArgentinoConfig.originAddress.city} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, originAddress: { ...current.originAddress, city: event.target.value } }))} style={inputStyle} />
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label style={labelStyle}>Provincia</label>
                              <input type="text" value={correoArgentinoConfig.originAddress.state} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, originAddress: { ...current.originAddress, state: event.target.value } }))} style={inputStyle} />
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label style={labelStyle}>Codigo provincia</label>
                              <input type="text" value={correoArgentinoConfig.originAddress.provinceCode} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, originAddress: { ...current.originAddress, provinceCode: event.target.value.toUpperCase() } }))} maxLength={1} placeholder="B" style={inputStyle} />
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label style={labelStyle}>Codigo postal</label>
                              <input type="text" value={correoArgentinoConfig.originAddress.postalCode} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, originAddress: { ...current.originAddress, postalCode: event.target.value } }))} style={inputStyle} />
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "grid", gap: 8 }}>
                          <strong style={{ fontSize: 15 }}>Modalidades y paquete</strong>
                          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label style={labelStyle}>Sucursal por defecto</label>
                              <input type="text" value={correoArgentinoConfig.defaultAgency} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, defaultAgency: event.target.value.toUpperCase() }))} placeholder="B0107" style={inputStyle} />
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label style={labelStyle}>Markup</label>
                              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "minmax(140px, 180px) 1fr" }}>
                                <select value={correoArgentinoConfig.pricing.markupType} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, pricing: { ...current.pricing, markupType: event.target.value } }))} style={inputStyle}>
                                  <option value="percentage">Porcentaje</option>
                                  <option value="fixed">Monto fijo</option>
                                </select>
                                <input type="number" min={0} step="0.01" value={correoArgentinoConfig.pricing.markupValue} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, pricing: { ...current.pricing, markupValue: event.target.value } }))} placeholder="0" style={inputStyle} />
                              </div>
                            </div>
                            <label style={{ ...checkboxRowStyle, alignSelf: "end" }}>
                              <input type="checkbox" checked={correoArgentinoConfig.pricing.roundToNearestHundred} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, pricing: { ...current.pricing, roundToNearestHundred: event.target.checked } }))} />
                              Redondear envio a centenas
                            </label>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label style={labelStyle}>Margen de empaque (%)</label>
                              <input type="number" min={0} max={100} step="0.1" value={correoArgentinoConfig.packagingMarginPercent} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, packagingMarginPercent: event.target.value }))} placeholder="8" style={inputStyle} />
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label style={labelStyle}>Dias extra de entrega</label>
                              <input type="number" min={0} step="1" value={correoArgentinoConfig.extraEstimatedDays} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, extraEstimatedDays: event.target.value }))} placeholder="5" style={inputStyle} />
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label style={labelStyle}>Peso por defecto (g)</label>
                              <input type="number" min={0} step="1" value={correoArgentinoConfig.defaultPackageDimensions.weightGrams} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, defaultPackageDimensions: { ...current.defaultPackageDimensions, weightGrams: event.target.value } }))} style={inputStyle} />
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label style={labelStyle}>Alto por defecto (cm)</label>
                              <input type="number" min={0} step="0.1" value={correoArgentinoConfig.defaultPackageDimensions.height} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, defaultPackageDimensions: { ...current.defaultPackageDimensions, height: event.target.value } }))} style={inputStyle} />
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label style={labelStyle}>Ancho por defecto (cm)</label>
                              <input type="number" min={0} step="0.1" value={correoArgentinoConfig.defaultPackageDimensions.width} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, defaultPackageDimensions: { ...current.defaultPackageDimensions, width: event.target.value } }))} style={inputStyle} />
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label style={labelStyle}>Largo por defecto (cm)</label>
                              <input type="number" min={0} step="0.1" value={correoArgentinoConfig.defaultPackageDimensions.length} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, defaultPackageDimensions: { ...current.defaultPackageDimensions, length: event.target.value } }))} style={inputStyle} />
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <label style={productChipStyle(correoArgentinoConfig.deliveryTypes.includes("D"))}>
                              <input type="checkbox" checked={correoArgentinoConfig.deliveryTypes.includes("D")} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, deliveryTypes: event.target.checked ? Array.from(new Set([...current.deliveryTypes, "D"])) : current.deliveryTypes.filter((value) => value !== "D") }))} />
                              <span>Domicilio</span>
                            </label>
                            <label style={productChipStyle(correoArgentinoConfig.deliveryTypes.includes("S"))}>
                              <input type="checkbox" checked={correoArgentinoConfig.deliveryTypes.includes("S")} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, deliveryTypes: event.target.checked ? Array.from(new Set([...current.deliveryTypes, "S"])) : current.deliveryTypes.filter((value) => value !== "S") }))} />
                              <span>Sucursal</span>
                            </label>
                          </div>
                        </div>

                        <div style={{ display: "grid", gap: 8 }}>
                          <strong style={{ fontSize: 15 }}>Reglas operativas</strong>
                          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <label style={productChipStyle(correoArgentinoConfig.rules.allowHomeDelivery)}>
                              <input type="checkbox" checked={correoArgentinoConfig.rules.allowHomeDelivery} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, rules: { ...current.rules, allowHomeDelivery: event.target.checked } }))} />
                              <span>Permitir domicilio</span>
                            </label>
                            <label style={productChipStyle(correoArgentinoConfig.rules.allowBranchDelivery)}>
                              <input type="checkbox" checked={correoArgentinoConfig.rules.allowBranchDelivery} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, rules: { ...current.rules, allowBranchDelivery: event.target.checked } }))} />
                              <span>Permitir sucursal</span>
                            </label>
                            <label style={productChipStyle(correoArgentinoConfig.rules.requireBranchSelection)}>
                              <input type="checkbox" checked={correoArgentinoConfig.rules.requireBranchSelection} onChange={(event) => setCorreoArgentinoConfig((current) => ({ ...current, rules: { ...current.rules, requireBranchSelection: event.target.checked } }))} />
                              <span>Requerir seleccion de sucursal</span>
                            </label>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={testCorreoArgentino}
                            disabled={saving || loading || testingIntegration !== null}
                            style={secondaryButtonStyle}
                          >
                            {testingIntegration === "correo-argentino" ? "Probando..." : "Probar integracion"}
                          </button>
                        </div>

                        <div style={integrationInfoCardStyle}>
                          <strong style={{ fontSize: 15 }}>Chequeos globales y por tienda</strong>
                          <div style={{ display: "grid", gap: 8 }}>
                            <div style={integrationCheckStyle(Boolean(correoArgentinoConfig.global.mode))}>
                              <span>Modo</span>
                              <strong>{correoArgentinoConfig.global.mode || "Sin definir"}</strong>
                            </div>
                            <div style={integrationCheckStyle(Boolean(correoArgentinoConfig.global.apiBaseUrl))}>
                              <span>Base URL</span>
                              <strong>{correoArgentinoConfig.global.apiBaseUrl || "Pendiente"}</strong>
                            </div>
                            <div style={integrationCheckStyle(correoArgentinoConfig.global.apiUsernameConfigured)}>
                              <span>API username global</span>
                              <strong>{correoArgentinoConfig.global.apiUsernameConfigured ? "Configurado" : "Pendiente"}</strong>
                            </div>
                            <div style={integrationCheckStyle(correoArgentinoConfig.global.apiPasswordConfigured)}>
                              <span>API password global</span>
                              <strong>{correoArgentinoConfig.global.apiPasswordConfigured ? "Configurado" : "Pendiente"}</strong>
                            </div>
                            <div style={integrationCheckStyle(correoArgentinoConfig.global.customerIdConfigured)}>
                              <span>Customer ID global</span>
                              <strong>{correoArgentinoConfig.global.customerIdConfigured ? "Configurado" : "Pendiente"}</strong>
                            </div>
                            <div style={integrationCheckStyle(Boolean(correoArgentinoConfig.senderName || correoArgentinoConfig.companyName))}>
                              <span>Remitente de la tienda</span>
                              <strong>{correoArgentinoConfig.senderName || correoArgentinoConfig.companyName ? "Configurado" : "Pendiente"}</strong>
                            </div>
                            <div style={integrationCheckStyle(Boolean(correoArgentinoConfig.originAddress.postalCode))}>
                              <span>Origen de la tienda</span>
                              <strong>{correoArgentinoConfig.originAddress.postalCode ? "Configurado" : "Pendiente"}</strong>
                            </div>
                            <div style={integrationCheckStyle(correoArgentinoConfig.deliveryTypes.length > 0)}>
                              <span>Modalidades</span>
                              <strong>{correoArgentinoConfig.deliveryTypes.length > 0 ? correoArgentinoConfig.deliveryTypes.join(", ") : "Pendiente"}</strong>
                            </div>
                          </div>
                        </div>

                        {correoArgentinoTestResult ? (
                          <div
                            style={{
                              ...integrationInfoCardStyle,
                              border: correoArgentinoTestResult!.ok
                                ? "1px solid var(--admin-tone-success-border)"
                                : "1px solid var(--admin-danger-border)",
                            }}
                          >
                            <strong style={{ fontSize: 15 }}>
                              {correoArgentinoTestResult!.ok ? "Test exitoso" : "Test con observaciones"}
                            </strong>
                            {correoArgentinoTestResult!.message ? (
                              <p style={hintStyle}>{correoArgentinoTestResult!.message}</p>
                            ) : null}
                            {correoArgentinoTestResult!.details ? (
                              <p style={hintStyle}>{correoArgentinoTestResult!.details}</p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </>
              ) : false ? (
                <>
                  <div style={{ display: "grid", gap: 8 }}>
                    <p style={eyebrowStyle}>Integracion seleccionada</p>
                    <h4 style={{ margin: 0, fontSize: 24 }}>Mercado Pago</h4>
                    <p style={copyStyle}>
                      Carga las credenciales de esta tienda y valida que la cuenta responda antes de publicar.
                    </p>
                  </div>

                  <div style={{ display: "grid", gap: 14 }}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <label style={labelStyle}>Public key</label>
                      <input
                        type="text"
                        value={mercadoPagoConfig.publicKey}
                        onChange={(event) => {
                          setMercadoPagoConfig((current) => ({
                            ...current,
                            publicKey: event.target.value,
                          }));
                          setMercadoPagoTestResult(null);
                        }}
                        placeholder="APP_USR-..."
                        style={inputStyle}
                      />
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      <label style={labelStyle}>Access token</label>
                      <input
                        type="password"
                        value={mercadoPagoConfig.accessToken}
                        onChange={(event) => {
                          setMercadoPagoConfig((current) => ({
                            ...current,
                            accessToken: event.target.value,
                          }));
                          setMercadoPagoTestResult(null);
                        }}
                        placeholder="APP_USR-..."
                        autoComplete="new-password"
                        style={inputStyle}
                      />
                      {mercadoPagoConfig.accessTokenConfigured && !mercadoPagoConfig.accessToken ? (
                        <p style={hintStyle}>
                          Token ya configurado en backend{mercadoPagoConfig.accessTokenPreview ? ` (${mercadoPagoConfig.accessTokenPreview})` : ""}. Cargá uno nuevo solo si querés rotarlo.
                        </p>
                      ) : null}
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      <label style={labelStyle}>Webhook secret</label>
                      <input
                        type="password"
                        value={mercadoPagoConfig.webhookSecret}
                        onChange={(event) => {
                          setMercadoPagoConfig((current) => ({
                            ...current,
                            webhookSecret: event.target.value,
                          }));
                          setMercadoPagoTestResult(null);
                        }}
                        placeholder="Secret del webhook"
                        autoComplete="new-password"
                        style={inputStyle}
                      />
                      {mercadoPagoConfig.webhookSecretConfigured && !mercadoPagoConfig.webhookSecret ? (
                        <p style={hintStyle}>
                          Secret ya configurado{mercadoPagoConfig.webhookSecretPreview ? ` (${mercadoPagoConfig.webhookSecretPreview})` : ""}. Escribí uno nuevo solo si querés reemplazarlo.
                        </p>
                      ) : null}
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      <label style={labelStyle}>Descuento por transferencia (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={mercadoPagoConfig.bankTransferDiscountPercentage}
                        onChange={(event) => {
                          setMercadoPagoConfig((current) => ({
                            ...current,
                            bankTransferDiscountPercentage: event.target.value,
                          }));
                        }}
                        placeholder="0"
                        style={inputStyle}
                      />
                      <p style={hintStyle}>
                        Si la tienda quiere incentivar transferencia bancaria, cargá acá el porcentaje. Ejemplo: 10.
                      </p>
                    </div>

                    <div style={integrationInfoCardStyle}>
                      <strong style={{ fontSize: 15 }}>Chequeos rapidos</strong>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={integrationCheckStyle(Boolean(mercadoPagoConfig.publicKey))}>
                          <span>Public key</span>
                          <strong>{mercadoPagoConfig.publicKey ? "Cargada" : "Pendiente"}</strong>
                        </div>
                        <div style={integrationCheckStyle(Boolean(mercadoPagoConfig.accessToken || mercadoPagoConfig.accessTokenConfigured))}>
                          <span>Access token</span>
                          <strong>{mercadoPagoConfig.accessToken || mercadoPagoConfig.accessTokenConfigured ? "Cargado" : "Pendiente"}</strong>
                        </div>
                        <div style={integrationCheckStyle(Boolean(mercadoPagoConfig.webhookSecret || mercadoPagoConfig.webhookSecretConfigured))}>
                          <span>Webhook secret</span>
                          <strong>{mercadoPagoConfig.webhookSecret || mercadoPagoConfig.webhookSecretConfigured ? "Cargado" : "Pendiente"}</strong>
                        </div>
                        <div style={integrationCheckStyle(Number(mercadoPagoConfig.bankTransferDiscountPercentage || 0) > 0)}>
                          <span>Descuento transferencia</span>
                          <strong>
                            {Number(mercadoPagoConfig.bankTransferDiscountPercentage || 0) > 0
                              ? `${Number(mercadoPagoConfig.bankTransferDiscountPercentage)}%`
                              : "Sin descuento"}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {mercadoPagoTestResult ? (
                      <div
                        style={{
                          ...integrationInfoCardStyle,
                          border: mercadoPagoTestResult!.ok
                            ? "1px solid var(--admin-tone-success-border)"
                            : "1px solid var(--admin-danger-border)",
                        }}
                      >
                        <strong style={{ fontSize: 15 }}>
                          {mercadoPagoTestResult!.ok ? "Test exitoso" : "Test con observaciones"}
                        </strong>
                        {mercadoPagoTestResult!.account ? (
                          <p style={hintStyle}>
                            Cuenta: {mercadoPagoTestResult!.account!.nickname || "Sin alias"}
                            {mercadoPagoTestResult!.account!.email
                              ? ` · ${mercadoPagoTestResult!.account!.email}`
                              : ""}
                          </p>
                        ) : null}
                        {mercadoPagoTestResult!.details ? (
                          <p style={hintStyle}>{mercadoPagoTestResult!.details}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </>
              ) : activeSection === "theme" ? (
                <div style={themePaletteCardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <p style={eyebrowStyle}>Theme</p>
                      <h4 style={{ margin: 0, fontSize: 22 }}>Paleta global</h4>
                      <p style={copyStyle}>
                        Haz click en el color para abrir el selector y ajusta cada tono con los canales RGB si quieres mayor precision.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={resetThemePalette}
                      disabled={!config || Object.keys(config.themePalette ?? {}).length === 0}
                      style={secondaryButtonStyle}
                    >
                      Restaurar paleta
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                      <strong style={{ fontSize: 14 }}>Presets de paleta</strong>
                      <label style={advancedToggleStyle}>
                        <input
                          type="checkbox"
                          checked={showAdvancedThemeOptions}
                          onChange={(event) => setShowAdvancedThemeOptions(event.target.checked)}
                        />
                        <span>Mostrar opciones avanzadas</span>
                      </label>
                    </div>

                    <div style={presetGridStyle}>
                      {themePalettePresets.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyThemePreset(preset.palette)}
                          style={presetCardStyle}
                        >
                          <strong>{preset.label}</strong>
                          <span style={presetDescriptionStyle}>{preset.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={themeGroupTabsStyle}>
                    {visibleThemePaletteGroups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setActiveThemeGroup(group.id)}
                        style={themeGroupTabButtonStyle(activeThemeGroup === group.id)}
                      >
                        {group.title}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "grid", gap: 18 }}>
                    {visibleThemePaletteGroups
                      .filter((group) => group.id === activeThemeGroup)
                      .map((group) => (
                      <section key={group.title} style={{ display: "grid", gap: 12 }}>
                        <div style={{ display: "grid", gap: 4 }}>
                          <h5 style={themePaletteGroupTitleStyle}>{group.title}</h5>
                          <p style={themePaletteGroupDescriptionStyle}>{group.description}</p>
                        </div>

                        <div style={themePaletteGridStyle}>
                          {group.fields.map((field) => {
                            const overrideValue = config?.themePalette?.[field.key] ?? "";
                            const resolvedValue = overrideValue || defaultThemePalette[field.key] || "";
                            const parsedRgb = parseColorToRgb(resolvedValue) ?? { r: 0, g: 0, b: 0 };
                            const pickerColor = `#${parsedRgb.r.toString(16).padStart(2, "0")}${parsedRgb.g
                              .toString(16)
                              .padStart(2, "0")}${parsedRgb.b.toString(16).padStart(2, "0")}`;
                            const autoSourceText =
                              field.autoSourceLabel ??
                              (defaultThemePalette[field.key] ? `Default: ${defaultThemePalette[field.key]}` : "Sin valor base");

                            return (
                              <div key={field.key} style={themePaletteFieldStyle}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                                  <div style={{ display: "grid", gap: 4 }}>
                                    <label style={labelStyle}>{field.label}</label>
                                    <p style={themePaletteDescriptionStyle}>{field.description}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => updateThemePaletteField(field.key, "")}
                                    disabled={!overrideValue}
                                    style={miniGhostButtonStyle(!overrideValue)}
                                  >
                                    Default
                                  </button>
                                </div>
                                <div style={themePaletteInputRowStyle}>
                                  <label style={themePalettePickerLabelStyle(resolvedValue)}>
                                    <input
                                      type="color"
                                      value={pickerColor}
                                      onChange={(event) => {
                                        const nextRgb = parseColorToRgb(event.target.value) ?? parsedRgb;
                                        updateThemePaletteField(field.key, formatRgbColor(nextRgb));
                                      }}
                                      style={themePaletteNativePickerStyle}
                                    />
                                  </label>
                                  <input
                                    type="text"
                                    value={overrideValue}
                                    onChange={(event) => updateThemePaletteField(field.key, event.target.value)}
                                    placeholder={defaultThemePalette[field.key] ?? "Ej: rgb(17, 17, 17)"}
                                    style={inputStyle}
                                  />
                                </div>
                                <div style={rgbInputsGridStyle}>
                                  {(["r", "g", "b"] as const).map((channel) => (
                                    <label key={channel} style={rgbChannelFieldStyle}>
                                      <span style={rgbChannelLabelStyle}>{channel.toUpperCase()}</span>
                                      <input
                                        type="number"
                                        min={0}
                                        max={255}
                                        step={1}
                                        value={parsedRgb[channel]}
                                        onChange={(event) =>
                                          updateThemePaletteRgbChannel(
                                            field.key,
                                            channel,
                                            event.target.value,
                                            defaultThemePalette[field.key] ?? "",
                                          )
                                        }
                                        style={rgbChannelInputStyle}
                                      />
                                    </label>
                                  ))}
                                </div>
                                <p style={hintStyle}>
                                  {overrideValue
                                    ? `Personalizado: ${overrideValue}`
                                    : autoSourceText}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>

                  <div style={themePaletteCardStyle}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <p style={eyebrowStyle}>Header y footer</p>
                      <h4 style={{ margin: 0, fontSize: 22 }}>Navegacion editable</h4>
                      <p style={copyStyle}>
                        Desde aca puedes cambiar textos y destinos de los links del header y footer sin tocar codigo.
                      </p>
                    </div>

                    <div style={{ display: "grid", gap: 16 }}>
                      <div style={themeNavSectionStyle}>
                        <div style={{ display: "grid", gap: 6 }}>
                          <strong style={{ fontSize: 15 }}>Header</strong>
                          <input
                            type="text"
                            value={currentThemeLayout.header?.brandLabel ?? ""}
                            onChange={(event) => updateHeaderBrandLabel(event.target.value)}
                            placeholder="Marca del header"
                            style={inputStyle}
                          />
                        </div>

                        <div style={{ display: "grid", gap: 10 }}>
                          {(currentThemeLayout.header?.primaryLinks ?? []).map((link, index) => (
                            <div key={`header-link-${index}`} style={themeNavRowStyle}>
                              <input
                                type="text"
                                value={link.label}
                                onChange={(event) =>
                                  updateHeaderLink(index, "label", event.target.value)
                                }
                                placeholder="Texto"
                                style={inputStyle}
                              />
                              <input
                                type="text"
                                value={link.href}
                                onChange={(event) =>
                                  updateHeaderLink(index, "href", event.target.value)
                                }
                                placeholder="/ruta o URL"
                                style={inputStyle}
                              />
                              <button
                                type="button"
                                onClick={() => removeHeaderLink(index)}
                                style={miniGhostDangerButtonStyle}
                              >
                                Quitar
                              </button>
                            </div>
                          ))}
                          <button type="button" onClick={addHeaderLink} style={secondaryButtonStyle}>
                            Agregar link al header
                          </button>
                        </div>
                      </div>

                      <div style={themeNavSectionStyle}>
                        <div style={{ display: "grid", gap: 8 }}>
                          <strong style={{ fontSize: 15 }}>Footer</strong>
                          <input
                            type="text"
                            value={currentThemeLayout.footer?.brandTitle ?? ""}
                            onChange={(event) => updateFooterField("brandTitle", event.target.value)}
                            placeholder="Titulo del footer"
                            style={inputStyle}
                          />
                          <textarea
                            value={currentThemeLayout.footer?.brandSubtitle ?? ""}
                            onChange={(event) => updateFooterField("brandSubtitle", event.target.value)}
                            placeholder="Descripcion breve del footer"
                            rows={3}
                            style={textareaStyle}
                          />
                        </div>

                        <div style={{ display: "grid", gap: 14 }}>
                          {(currentThemeLayout.footer?.columns ?? []).map((column, columnIndex) => (
                            <div key={`footer-column-${columnIndex}`} style={themeFooterColumnStyle}>
                              <div style={themeNavRowStyle}>
                                <input
                                  type="text"
                                  value={column.title}
                                  onChange={(event) =>
                                    updateFooterColumnTitle(columnIndex, event.target.value)
                                  }
                                  placeholder="Titulo de columna"
                                  style={inputStyle}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeFooterColumn(columnIndex)}
                                  style={miniGhostDangerButtonStyle}
                                >
                                  Quitar columna
                                </button>
                              </div>

                              <div style={{ display: "grid", gap: 10 }}>
                                {column.links.map((link, linkIndex) => (
                                  <div
                                    key={`footer-column-${columnIndex}-link-${linkIndex}`}
                                    style={themeNavRowStyle}
                                  >
                                    <input
                                      type="text"
                                      value={link.label}
                                      onChange={(event) =>
                                        updateFooterLink(
                                          columnIndex,
                                          linkIndex,
                                          "label",
                                          event.target.value,
                                        )
                                      }
                                      placeholder="Texto"
                                      style={inputStyle}
                                    />
                                    <input
                                      type="text"
                                      value={link.href}
                                      onChange={(event) =>
                                        updateFooterLink(
                                          columnIndex,
                                          linkIndex,
                                          "href",
                                          event.target.value,
                                        )
                                      }
                                      placeholder="/ruta o URL"
                                      style={inputStyle}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeFooterLink(columnIndex, linkIndex)}
                                      style={miniGhostDangerButtonStyle}
                                    >
                                      Quitar
                                    </button>
                                  </div>
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={() => addFooterLink(columnIndex)}
                                style={secondaryButtonStyle}
                              >
                                Agregar link a la columna
                              </button>
                            </div>
                          ))}

                          <button type="button" onClick={addFooterColumn} style={secondaryButtonStyle}>
                            Agregar columna al footer
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : !activeBlock ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <p style={copyStyle}>No encontramos bloques para esta tienda.</p>
                  <p style={hintStyle}>Puedes crear uno nuevo desde el selector de la columna izquierda.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gap: 8 }}>
                    <p style={eyebrowStyle}>Bloque seleccionado</p>
                    <h4 style={{ margin: 0, fontSize: 24 }}>
                      {blockLabels[activeBlock.type] ?? activeBlock.type}
                    </h4>
                  </div>

                  <div style={{ display: "grid", gap: 14 }}>
                    {(blockFieldMap[activeBlock.type] ?? []).length === 0 ? (
                      <p style={hintStyle}>
                        Este bloque no tiene campos editables desde el panel por ahora, pero puedes moverlo o eliminarlo.
                      </p>
                    ) : null}
                    {(blockFieldMap[activeBlock.type] ?? []).map((field) => {
                      if (field.type === "products") {
                        const selectedProductIds = Array.isArray(activeBlock.props?.productIds)
                          ? (activeBlock.props?.productIds as unknown[])
                              .map((value) => Number(value))
                              .filter((value) => Number.isInteger(value) && value > 0)
                          : [];

                        return (
                          <div key={field.key} style={{ display: "grid", gap: 10 }}>
                            <label style={labelStyle}>{field.label}</label>
                            <p style={hintStyle}>
                              Si eliges productos manualmente, esa seleccion prevalece sobre la categoria.
                            </p>
                            <div style={productPickerStyle}>
                              {products.map((product) => {
                                const checked = selectedProductIds.includes(product.id);
                                return (
                                  <label key={product.id} style={productChipStyle(checked)}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleProduct(product.id)}
                                    />
                                    <span>{product.title}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      if (field.type === "image") {
                        const imageUrl = String(activeBlock.props?.[field.key] ?? "");

                        return (
                          <div key={field.key} style={{ display: "grid", gap: 10 }}>
                            <label style={labelStyle}>{field.label}</label>
                            <div style={assetActionsStyle}>
                              <label style={uploadButtonStyle}>
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  style={{ display: "none" }}
                                  onChange={(event) => {
                                    void uploadFieldAsset(field.key, event.target.files?.[0] ?? null);
                                    event.currentTarget.value = "";
                                  }}
                                />
                                {uploadingKey === `field:${field.key}` ? "Subiendo..." : "Subir imagen"}
                              </label>
                              {imageUrl ? (
                                <button
                                  type="button"
                                  onClick={() => updateField(field.key, "")}
                                  style={dangerButtonStyle}
                                >
                                  Quitar imagen
                                </button>
                              ) : null}
                            </div>
                            {imageUrl ? (
                              <div style={assetPreviewCardStyle}>
                                <Image
                                  src={resolveAssetUrl(imageUrl) ?? imageUrl}
                                  alt={field.label}
                                  width={1200}
                                  height={720}
                                  unoptimized
                                  style={assetPreviewImageStyle}
                                />
                              </div>
                            ) : null}
                          </div>
                        );
                      }

                      const categoryAwareField =
                        field.key === "category"
                          ? { ...field, options: categoryOptions }
                          : field;
                      const rawValue = activeBlock.props?.[field.key];
                      const value =
                        categoryAwareField.type === "number"
                          ? Number(rawValue ?? 0)
                          : String(rawValue ?? "");

                      if (categoryAwareField.type === "textarea") {
                        return (
                          <div key={field.key} style={{ display: "grid", gap: 8 }}>
                            <label style={labelStyle}>{field.label}</label>
                            <textarea
                              value={value}
                              onChange={(event) => updateField(field.key, event.target.value)}
                              style={textareaStyle}
                              rows={4}
                            />
                          </div>
                        );
                      }

                      if (categoryAwareField.type === "select") {
                        return (
                          <div key={field.key} style={{ display: "grid", gap: 8 }}>
                            <label style={labelStyle}>{field.label}</label>
                            <select
                              value={value}
                              onChange={(event) => updateField(field.key, event.target.value)}
                              style={inputStyle}
                            >
                              {categoryAwareField.options.map((option) => (
                                <option key={option.value || "empty"} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      return (
                        <div key={field.key} style={{ display: "grid", gap: 8 }}>
                          <label style={labelStyle}>{field.label}</label>
                          <input
                            type={categoryAwareField.type === "number" ? "number" : categoryAwareField.type === "color" ? "color" : "text"}
                            value={value}
                            onChange={(event) =>
                              updateField(
                                field.key,
                                categoryAwareField.type === "number"
                                  ? Number(event.target.value || 0)
                                  : event.target.value,
                              )
                            }
                            style={categoryAwareField.type === "color" ? colorInputStyle : inputStyle}
                          />
                        </div>
                      );
                    })}

                    {activeBlock.type === "hero_carousel" ? (
                      <div style={{ display: "grid", gap: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <label style={labelStyle}>Slides del hero</label>
                          <button type="button" onClick={addSlide} style={secondaryButtonStyle}>
                            Agregar slide
                          </button>
                        </div>
                        <div style={{ display: "grid", gap: 12 }}>
                          {(Array.isArray(activeBlock.props?.slides) ? activeBlock.props.slides : []).map((slide, slideIndex) => {
                            const safeSlide =
                              slide && typeof slide === "object"
                                ? (slide as Record<string, unknown>)
                                : {};

                            return (
                              <div key={slideIndex} style={slideCardStyle}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                                  <strong>Slide {slideIndex + 1}</strong>
                                  <button type="button" onClick={() => removeSlide(slideIndex)} style={dangerButtonStyle}>
                                    Quitar
                                  </button>
                                </div>
                                <div style={assetActionsStyle}>
                                  <label style={uploadButtonStyle}>
                                    <input
                                      type="file"
                                      accept="image/png,image/jpeg,image/webp"
                                      style={{ display: "none" }}
                                      onChange={(event) => {
                                        void uploadSlideAsset(
                                          slideIndex,
                                          "image",
                                          event.target.files?.[0] ?? null,
                                        );
                                        event.currentTarget.value = "";
                                      }}
                                    />
                                    {uploadingKey === `slide:${slideIndex}:image`
                                      ? "Subiendo..."
                                      : "Subir imagen principal"}
                                  </label>
                                  <label style={uploadButtonStyle}>
                                    <input
                                      type="file"
                                      accept="image/png,image/jpeg,image/webp"
                                      style={{ display: "none" }}
                                      onChange={(event) => {
                                        void uploadSlideAsset(
                                          slideIndex,
                                          "responsiveImage",
                                          event.target.files?.[0] ?? null,
                                        );
                                        event.currentTarget.value = "";
                                      }}
                                    />
                                    {uploadingKey === `slide:${slideIndex}:responsiveImage`
                                      ? "Subiendo..."
                                      : "Subir imagen responsive"}
                                  </label>
                                  {String(safeSlide.image ?? "") ? (
                                    <button
                                      type="button"
                                      onClick={() => updateSlide(slideIndex, "image", "")}
                                      style={dangerButtonStyle}
                                    >
                                      Quitar imagen
                                    </button>
                                  ) : null}
                                  {String(safeSlide.responsiveImage ?? "") ? (
                                    <button
                                      type="button"
                                      onClick={() => updateSlide(slideIndex, "responsiveImage", "")}
                                      style={dangerButtonStyle}
                                    >
                                      Quitar responsive
                                    </button>
                                  ) : null}
                                </div>
                                {String(safeSlide.image ?? "") ? (
                                  <div style={assetPreviewCardStyle}>
                                    <Image
                                      src={resolveAssetUrl(String(safeSlide.image ?? "")) ?? String(safeSlide.image ?? "")}
                                      alt={`Slide ${slideIndex + 1}`}
                                      width={1200}
                                      height={720}
                                      unoptimized
                                      style={assetPreviewImageStyle}
                                    />
                                  </div>
                                ) : null}
                                {String(safeSlide.responsiveImage ?? "") ? (
                                  <div style={{ ...assetPreviewCardStyle, gap: 8 }}>
                                    <span style={hintStyle}>Vista previa responsive</span>
                                    <Image
                                      src={
                                        resolveAssetUrl(String(safeSlide.responsiveImage ?? "")) ??
                                        String(safeSlide.responsiveImage ?? "")
                                      }
                                      alt={`Slide ${slideIndex + 1} responsive`}
                                      width={720}
                                      height={960}
                                      unoptimized
                                      style={assetPreviewImageStyle}
                                    />
                                  </div>
                                ) : null}
                                <input
                                  value={String(safeSlide.eyebrow ?? "")}
                                  onChange={(event) => updateSlide(slideIndex, "eyebrow", event.target.value)}
                                  placeholder="Eyebrow"
                                  style={inputStyle}
                                />
                                <input
                                  value={String(safeSlide.title ?? "")}
                                  onChange={(event) => updateSlide(slideIndex, "title", event.target.value)}
                                  placeholder="Titulo"
                                  style={inputStyle}
                                />
                                <textarea
                                  value={String(safeSlide.subtitle ?? "")}
                                  onChange={(event) => updateSlide(slideIndex, "subtitle", event.target.value)}
                                  placeholder="Subtitulo"
                                  style={textareaStyle}
                                  rows={3}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {activeBlock.type === "category_image_strip" ? (
                      <div style={{ display: "grid", gap: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <div style={{ display: "grid", gap: 4 }}>
                            <label style={labelStyle}>Categorias del bloque</label>
                            <p style={hintStyle}>
                              La cantidad de imagenes se define por cuantas categorias agregues aqui.
                            </p>
                          </div>
                          <button type="button" onClick={addCategoryImageStripItem} style={secondaryButtonStyle}>
                            Agregar categoria
                          </button>
                        </div>

                        <div style={{ display: "grid", gap: 12 }}>
                          {getCategoryImageStripItems().map((item, itemIndex) => {
                            const imageUrl = String(item.image ?? "");
                            const title = String(item.title ?? "");
                            const selectedCategories = Array.isArray(item.categorySlugs)
                              ? item.categorySlugs.map((slug) => String(slug))
                              : [];

                            return (
                              <div key={itemIndex} style={slideCardStyle}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                                  <strong>Categoria {itemIndex + 1}</strong>
                                  <button
                                    type="button"
                                    onClick={() => removeCategoryImageStripItem(itemIndex)}
                                    style={dangerButtonStyle}
                                  >
                                    Quitar
                                  </button>
                                </div>

                                <div style={{ display: "grid", gap: 8 }}>
                                  <label style={labelStyle}>Nombre</label>
                                  <input
                                    value={title}
                                    onChange={(event) =>
                                      updateCategoryImageStripItem(itemIndex, "title", event.target.value)
                                    }
                                    style={inputStyle}
                                    placeholder="Ejemplo: Abrigos"
                                  />
                                </div>

                                <div style={{ display: "grid", gap: 8 }}>
                                  <label style={labelStyle}>Categorias que abre</label>
                                  <div style={productPickerStyle}>
                                    {categories.map((category) => {
                                      const checked = selectedCategories.includes(category.slug);

                                      return (
                                        <label key={category.id} style={productChipStyle(checked)}>
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() =>
                                              toggleCategoryImageStripCategory(itemIndex, category.slug)
                                            }
                                          />
                                          <span>{category.name}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div style={assetActionsStyle}>
                                  <label style={uploadButtonStyle}>
                                    <input
                                      type="file"
                                      accept="image/png,image/jpeg,image/webp"
                                      style={{ display: "none" }}
                                      onChange={(event) => {
                                        void uploadCategoryImageStripAsset(
                                          itemIndex,
                                          event.target.files?.[0] ?? null,
                                        );
                                        event.currentTarget.value = "";
                                      }}
                                    />
                                    {uploadingKey === `category-image-strip:${itemIndex}` ? "Subiendo..." : "Subir imagen"}
                                  </label>
                                  {imageUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => updateCategoryImageStripItem(itemIndex, "image", "")}
                                      style={dangerButtonStyle}
                                    >
                                      Quitar imagen
                                    </button>
                                  ) : null}
                                </div>

                                {imageUrl ? (
                                  <div style={assetPreviewCardStyle}>
                                    <Image
                                      src={resolveAssetUrl(imageUrl) ?? imageUrl}
                                      alt={`Categoria ${itemIndex + 1}`}
                                      width={1200}
                                      height={720}
                                      unoptimized
                                      style={assetPreviewImageStyle}
                                    />
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {activeBlock.type === "benefits" ? (
                      <div style={{ display: "grid", gap: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <div style={{ display: "grid", gap: 4 }}>
                            <label style={labelStyle}>Cards del bloque</label>
                            <p style={hintStyle}>
                              Puedes definir manualmente el contenido, la cantidad y el icono de cada card.
                            </p>
                          </div>
                          <button type="button" onClick={addBenefitItem} style={secondaryButtonStyle}>
                            Agregar card
                          </button>
                        </div>

                        <div style={{ display: "grid", gap: 12 }}>
                          {getBenefitItems().map((item, itemIndex) => {
                            const iconImage = String(item.iconImage ?? "");
                            const icon = String(item.icon ?? "shield");

                            return (
                              <div key={itemIndex} style={slideCardStyle}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                                  <strong>Card {itemIndex + 1}</strong>
                                  <button
                                    type="button"
                                    onClick={() => removeBenefitItem(itemIndex)}
                                    style={dangerButtonStyle}
                                  >
                                    Quitar
                                  </button>
                                </div>

                                <input
                                  value={String(item.title ?? "")}
                                  onChange={(event) => updateBenefitItem(itemIndex, "title", event.target.value)}
                                  placeholder="Titulo"
                                  style={inputStyle}
                                />

                                <textarea
                                  value={String(item.description ?? "")}
                                  onChange={(event) =>
                                    updateBenefitItem(itemIndex, "description", event.target.value)
                                  }
                                  placeholder="Descripcion"
                                  style={textareaStyle}
                                  rows={3}
                                />

                                <div style={{ display: "grid", gap: 8 }}>
                                  <label style={labelStyle}>Icono predeterminado</label>
                                  <select
                                    value={icon}
                                    onChange={(event) => updateBenefitItem(itemIndex, "icon", event.target.value)}
                                    style={inputStyle}
                                  >
                                    {benefitsIconOptions.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div style={assetActionsStyle}>
                                  <label style={uploadButtonStyle}>
                                    <input
                                      type="file"
                                      accept="image/png,image/jpeg,image/webp"
                                      style={{ display: "none" }}
                                      onChange={(event) => {
                                        void uploadBenefitIconAsset(itemIndex, event.target.files?.[0] ?? null);
                                        event.currentTarget.value = "";
                                      }}
                                    />
                                    {uploadingKey === `benefit-icon:${itemIndex}` ? "Subiendo..." : "Subir icono"}
                                  </label>
                                  {iconImage ? (
                                    <button
                                      type="button"
                                      onClick={() => updateBenefitItem(itemIndex, "iconImage", "")}
                                      style={dangerButtonStyle}
                                    >
                                      Quitar icono subido
                                    </button>
                                  ) : null}
                                </div>

                                {iconImage ? (
                                  <div style={assetPreviewCardStyle}>
                                    <Image
                                      src={resolveAssetUrl(iconImage) ?? iconImage}
                                      alt={`Icono ${itemIndex + 1}`}
                                      width={120}
                                      height={120}
                                      unoptimized
                                      style={{ ...assetPreviewImageStyle, maxWidth: 80, margin: "0 auto" }}
                                    />
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>

          {error ? <p style={errorStyle}>{error}</p> : null}
          {success ? <p style={successStyle}>{success}</p> : null}
        </div>
      )}
    </section>
  );
}

const cardStyle: React.CSSProperties = {
  padding: 28,
  borderRadius: 32,
  border: "1px solid var(--account-item-border)",
  background: "var(--page-panel-bg)",
  display: "grid",
  gap: 20,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const developerGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 0.34fr) minmax(0, 1fr)",
  gap: 18,
  alignItems: "start",
};

const sectionTabsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const addBlockPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const menuCardStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  padding: 18,
  display: "grid",
  gap: 14,
};

const editorCardStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  padding: 20,
  display: "grid",
  gap: 18,
};

const themePaletteCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  padding: 18,
  borderRadius: 22,
  border: "1px solid var(--account-item-border)",
  background: "rgba(255,255,255,0.03)",
};

const themePaletteGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const themePaletteFieldStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  padding: 14,
  borderRadius: 18,
  border: "1px solid var(--account-item-border)",
  background: "rgba(255,255,255,0.03)",
};

const themePaletteDescriptionStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.45,
  color: "var(--account-text-soft)",
};

const themePaletteGroupTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 16,
  color: "var(--account-text-strong)",
};

const themePaletteGroupDescriptionStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.5,
  color: "var(--account-text-soft)",
};

const themeGroupTabsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const themeGroupTabButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: "10px 14px",
  borderRadius: 999,
  border: active ? "1px solid var(--account-item-border-active)" : "1px solid var(--account-item-border)",
  background: active ? "var(--account-item-bg-active)" : "var(--account-item-bg)",
  color: "var(--account-text-strong)",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: "nowrap",
  flex: "0 1 auto",
});

const presetGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
};

const presetCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  padding: "12px 14px",
  borderRadius: 16,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  color: "var(--account-text-strong)",
  cursor: "pointer",
  textAlign: "left",
};

const presetDescriptionStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1.45,
  color: "var(--account-text-soft)",
};

const advancedToggleStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: "var(--account-text-strong)",
  flexWrap: "wrap",
};

const saveStatusChipStyle = (dirty: boolean): React.CSSProperties => ({
  display: "grid",
  gap: 2,
  padding: "10px 14px",
  borderRadius: 16,
  border: dirty
    ? "1px solid color-mix(in srgb, var(--theme-colors-accent) 34%, var(--account-item-border-active))"
    : "1px solid var(--account-item-border)",
  background: dirty
    ? "color-mix(in srgb, var(--theme-colors-accent) 14%, var(--page-panel-bg))"
    : "var(--account-item-bg)",
  color: "var(--account-text-strong)",
  minWidth: 180,
});

const themePaletteInputRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "40px minmax(0, 1fr)",
  gap: 10,
  alignItems: "center",
};

const rgbInputsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
};

const rgbChannelFieldStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
};

const rgbChannelLabelStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--account-text-soft)",
};

const rgbChannelInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid var(--account-item-border)",
  background: "rgba(255,255,255,0.03)",
  color: "var(--page-fg)",
  fontSize: 14,
};

const themePalettePickerLabelStyle = (value: string): React.CSSProperties => ({
  width: 40,
  height: 40,
  display: "block",
  position: "relative",
  borderRadius: 12,
  border: "1px solid var(--account-item-border)",
  background: value || "linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04))",
  overflow: "hidden",
  cursor: "pointer",
});

const themePaletteNativePickerStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  opacity: 0,
  cursor: "pointer",
};

const miniGhostButtonStyle = (disabled: boolean): React.CSSProperties => ({
  borderRadius: 999,
  border: "1px solid var(--account-item-border)",
  background: "transparent",
  color: "var(--page-fg)",
  fontSize: 12,
  padding: "6px 10px",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.45 : 1,
});

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  fontSize: 12,
  color: "var(--account-text-strong)",
};

const titleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: 24,
};

const copyStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "var(--account-text-muted)",
  lineHeight: 1.7,
};

const labelStyle: React.CSSProperties = {
  color: "var(--account-text-strong)",
  fontSize: 14,
};

const hintStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--account-text-soft)",
  fontSize: 13,
  lineHeight: 1.6,
};

const dragHintStyle: React.CSSProperties = {
  color: "var(--account-text-soft)",
  fontSize: 12,
  lineHeight: 1.4,
};

const blockListItemStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: 0,
  alignItems: "stretch",
};

const contextMenuStyle: React.CSSProperties = {
  position: "fixed",
  zIndex: 1200,
  minWidth: 188,
  padding: 8,
  borderRadius: 16,
  border: "1px solid var(--account-item-border)",
  background: "var(--page-panel-strong-bg)",
  boxShadow: "0 18px 40px rgba(24, 16, 12, 0.12)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 16,
  background: "var(--muted-field-bg)",
  color: "var(--account-text-strong)",
  border: "1px solid var(--checkout-border)",
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: 104,
};

const colorInputStyle: React.CSSProperties = {
  ...inputStyle,
  padding: 6,
  minHeight: 52,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "12px 16px",
  background: "var(--checkout-primary-bg)",
  color: "var(--checkout-primary-color)",
  border: "1px solid var(--account-item-border-active)",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "12px 16px",
  background: "var(--account-item-bg)",
  color: "var(--account-text-strong)",
  border: "1px solid var(--account-item-border)",
  borderRadius: 999,
  cursor: "pointer",
};

const miniGhostDangerButtonStyle: React.CSSProperties = {
  padding: "10px 12px",
  background: "color-mix(in srgb, var(--page-panel-strong-bg) 92%, var(--page-panel-bg))",
  color: "var(--account-text-strong)",
  border: "1px solid var(--checkout-border)",
  borderRadius: 999,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const dangerButtonStyle: React.CSSProperties = {
  padding: "8px 12px",
  background: "color-mix(in srgb, var(--page-panel-strong-bg) 94%, var(--page-panel-bg))",
  color: "var(--account-text-strong)",
  border: "1px solid var(--checkout-border)",
  borderRadius: 999,
  cursor: "pointer",
};

const contextMenuDangerButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "transparent",
  color: "var(--admin-danger-color)",
  border: "1px solid transparent",
  borderRadius: 12,
  cursor: "pointer",
  textAlign: "left",
};

const errorStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--admin-danger-color)",
};

const successStyle: React.CSSProperties = {
  margin: 0,
  padding: "14px 16px",
  borderRadius: 18,
  border: "1px solid var(--admin-tone-success-border)",
  background: "var(--admin-tone-success-bg)",
  color: "var(--admin-tone-success-color)",
  fontWeight: 700,
  lineHeight: 1.5,
};

const themeNavSectionStyle: React.CSSProperties = {
  display: "grid",
  gap: 14,
  padding: 18,
  borderRadius: 22,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
};

const themeNavRowStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr) auto",
  alignItems: "center",
};

const themeFooterColumnStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 16,
  borderRadius: 18,
  border: "1px solid var(--account-item-border)",
  background: "var(--page-panel-bg)",
};

const productPickerStyle: React.CSSProperties = {
  maxHeight: 260,
  overflowY: "auto",
  display: "grid",
  gap: 8,
};

const slideCardStyle: React.CSSProperties = {
  borderRadius: 20,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  padding: 16,
  display: "grid",
  gap: 10,
  color: "var(--account-text-strong)",
};

const assetActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

const uploadButtonStyle: React.CSSProperties = {
  padding: "12px 16px",
  background: "var(--account-item-bg)",
  color: "var(--account-text-strong)",
  border: "1px solid var(--account-item-border)",
  borderRadius: 999,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
};

const assetPreviewCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 0,
  padding: 14,
  borderRadius: 18,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
};

const assetPreviewImageStyle: React.CSSProperties = {
  width: "100%",
  maxHeight: 220,
  objectFit: "cover",
  borderRadius: 14,
  border: "1px solid var(--account-item-border)",
};

const integrationInfoCardStyle: React.CSSProperties = {
  borderRadius: 20,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  padding: 16,
  display: "grid",
  gap: 10,
};

function sectionTabButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: "12px 16px",
    borderRadius: 999,
    border: active
      ? "1px solid var(--account-item-border-active)"
      : "1px solid var(--account-item-border)",
    background: active ? "var(--account-item-bg-active)" : "var(--account-item-bg)",
    color: "var(--account-text-strong)",
    cursor: "pointer",
    fontWeight: 700,
  };
}

function blockNavStyle(active: boolean): React.CSSProperties {
  return {
    borderRadius: 18,
    border: active
      ? "1px solid var(--account-item-border-active)"
      : "1px solid var(--account-item-border)",
    background: active ? "var(--account-item-bg-active)" : "var(--account-item-bg)",
    padding: "12px 14px",
    color: "var(--account-text-strong)",
    cursor: "pointer",
    display: "grid",
    gap: 4,
    textAlign: "left",
  };
}

function integrationCheckStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    padding: "12px 14px",
    borderRadius: 16,
    border: active
      ? "1px solid var(--account-item-border-active)"
      : "1px solid var(--account-item-border)",
    background: active ? "var(--account-item-bg-active)" : "var(--account-item-bg)",
    color: "var(--account-text-strong)",
  };
}

function productChipStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "12px 14px",
    borderRadius: 16,
    border: active
      ? "1px solid var(--account-item-border-active)"
      : "1px solid var(--account-item-border)",
    background: active ? "var(--account-item-bg-active)" : "var(--account-item-bg)",
    color: "var(--account-text-strong)",
  };
}
