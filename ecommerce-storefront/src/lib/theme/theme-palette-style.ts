import type { CSSProperties } from "react";
import {
  themePaletteSurfaceCssVarMap,
  themePaletteSurfaceKeys,
  type ThemePalette,
} from "@/types/theme";

const toCssVarName = (path: string[]) =>
  `--theme-${path
    .map((segment) => segment.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase())
    .join("-")}`;

const flattenThemeTokens = (
  value: unknown,
  path: string[] = [],
): Record<string, string | number> => {
  if (value === null || value === undefined) {
    return {};
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    if (path.length === 0) return {};
    return { [toCssVarName(path)]: value as string | number };
  }

  return Object.entries(value as Record<string, unknown>).reduce(
    (acc, [key, nestedValue]) => ({
      ...acc,
      ...flattenThemeTokens(nestedValue, [...path, key]),
    }),
    {},
  );
};

const derivedThemeStyle = (themePalette?: ThemePalette) => {
  const pick = (key: keyof ThemePalette, fallback: string) => themePalette?.[key] || fallback;

  const themeStyle: Record<string, string> = {
    "--background": "var(--theme-colors-background)",
    "--foreground": "var(--theme-colors-text)",
    "--surface": "var(--theme-colors-background-soft)",
    "--surface-soft": "var(--theme-colors-background-elevated)",
    "--border-soft": "var(--theme-colors-border)",
    "--border-strong": "var(--theme-colors-border-strong)",
    "--paper": "var(--theme-colors-paper)",
    "--paper-muted": "var(--theme-colors-paper-muted)",
    "--text-strong": "var(--theme-colors-text-strong)",
    "--text-muted": "var(--theme-colors-text-muted)",
    "--accent": "var(--theme-colors-accent)",
    "--accent-strong": "var(--theme-colors-accent-strong)",
    "--accent-contrast": "var(--theme-colors-accent-contrast)",
    "--page-shell-bg": pick("pageShellBg", "var(--theme-colors-background)"),
    "--store-shell-bg": pick("storeShellBg", "var(--page-shell-bg)"),
    "--page-panel-bg": pick(
      "pagePanelBg",
      "color-mix(in srgb, var(--theme-colors-background-soft) 88%, var(--theme-colors-background))",
    ),
    "--page-panel-strong-bg": pick(
      "pagePanelStrongBg",
      "color-mix(in srgb, var(--theme-colors-background-elevated) 92%, var(--theme-colors-background))",
    ),
    "--muted-field-bg": pick(
      "mutedFieldBg",
      "color-mix(in srgb, var(--theme-colors-background-elevated) 82%, var(--theme-colors-background))",
    ),
    "--muted-field-color": "var(--theme-colors-text-strong)",
    "--ghost-chip-border": "var(--theme-colors-border)",
    "--ghost-chip-active-border": "var(--theme-colors-border-strong)",
    "--ghost-chip-bg": "transparent",
    "--ghost-chip-active-bg": "color-mix(in srgb, var(--theme-colors-paper-muted) 22%, transparent)",
    "--ghost-chip-color": "var(--theme-colors-text-strong)",
    "--store-content-bg": "transparent",
    "--block-section-bg": "transparent",
    "--block-card-bg": pick("blockCardBg", "var(--page-panel-bg)"),
    "--block-panel-bg": pick("blockPanelBg", "var(--page-panel-strong-bg)"),
    "--testimonial-card-bg": pick("testimonialCardBg", "var(--page-panel-bg)"),
    "--testimonial-card-featured-bg": pick("testimonialCardFeaturedBg", "var(--page-panel-strong-bg)"),
    "--newsletter-shell-bg": pick("newsletterShellBg", "var(--page-panel-strong-bg)"),
    "--newsletter-input-bg": "var(--muted-field-bg)",
    "--product-media-fallback": "var(--theme-colors-paper)",
    "--category-image-overlay":
      "linear-gradient(180deg, color-mix(in srgb, var(--theme-colors-background) 12%, transparent), color-mix(in srgb, var(--theme-colors-background) 28%, transparent))",
    "--header-action-bg": "var(--page-panel-bg)",
    "--header-action-bg-active": "var(--page-panel-strong-bg)",
    "--header-action-border": "var(--theme-colors-border)",
    "--header-action-border-active": "var(--theme-colors-border-strong)",
    "--header-action-color": "var(--theme-colors-text-strong)",
    "--header-action-badge-bg": "var(--theme-colors-accent-strong)",
    "--header-action-badge-color": "var(--theme-colors-accent-contrast)",
    "--notification-panel-bg": "var(--page-panel-bg)",
    "--notification-panel-mobile-bg": "var(--page-panel-bg)",
    "--notification-panel-border": "var(--theme-colors-border)",
    "--notification-header-bg": "var(--page-panel-strong-bg)",
    "--notification-header-border": "var(--theme-colors-border)",
    "--notification-card-bg": "var(--page-panel-strong-bg)",
    "--notification-card-border": "var(--theme-colors-border)",
    "--notification-empty-bg": "var(--page-panel-strong-bg)",
    "--notification-empty-border": "var(--theme-colors-border-strong)",
    "--notification-text-strong": "var(--theme-colors-text-strong)",
    "--notification-text-muted": "var(--theme-colors-text-muted)",
    "--notification-text-soft": "var(--theme-colors-text)",
    "--notification-text-faint": "color-mix(in srgb, var(--theme-colors-text) 78%, transparent)",
    "--checkout-panel-bg": "var(--page-panel-bg)",
    "--checkout-panel-strong-bg": "var(--page-panel-strong-bg)",
    "--checkout-card-bg": "var(--page-panel-bg)",
    "--checkout-card-alt-bg": "var(--page-panel-strong-bg)",
    "--checkout-border": "var(--theme-colors-border)",
    "--checkout-border-strong": "var(--theme-colors-border-strong)",
    "--checkout-text-strong": "var(--theme-colors-text-strong)",
    "--checkout-text-muted": "var(--theme-colors-text-muted)",
    "--checkout-field-bg": "var(--muted-field-bg)",
    "--checkout-field-color": "var(--theme-colors-text-strong)",
    "--checkout-primary-bg": "var(--theme-colors-accent-strong)",
    "--checkout-primary-color": "var(--theme-colors-accent-contrast)",
    "--checkout-secondary-bg": "var(--page-panel-bg)",
    "--checkout-secondary-color": "var(--theme-colors-text-strong)",
    "--account-shell-bg": pick("accountShellBg", "var(--page-shell-bg)"),
    "--account-sidebar-bg": pick("accountSidebarBg", "var(--page-panel-bg)"),
    "--account-sidebar-border": "var(--theme-colors-border)",
    "--account-group-bg": pick("accountGroupBg", "var(--page-panel-strong-bg)"),
    "--account-group-border": "var(--theme-colors-border)",
    "--account-item-bg": pick("accountItemBg", "var(--page-panel-bg)"),
    "--account-item-bg-active": pick("accountItemBgActive", "var(--page-panel-strong-bg)"),
    "--account-item-border": pick("accountItemBorder", "var(--theme-colors-border)"),
    "--account-item-border-active": pick("accountItemBorderActive", "var(--theme-colors-border-strong)"),
    "--account-text-strong": "var(--theme-colors-text-strong)",
    "--account-text-muted": "var(--theme-colors-text-muted)",
    "--account-text-soft": "color-mix(in srgb, var(--theme-colors-text) 76%, transparent)",
    "--account-text-faint": "color-mix(in srgb, var(--theme-colors-text) 58%, transparent)",
    "--admin-stat-bg": "var(--page-panel-bg)",
    "--admin-preview-stage-bg": "var(--page-panel-bg)",
    "--admin-preview-frame-border": "var(--theme-colors-border-strong)",
    "--admin-preview-gridline": "var(--theme-colors-border)",
    "--admin-preview-guide-border": "var(--theme-colors-border-strong)",
    "--admin-preview-guide-bg": "var(--page-panel-strong-bg)",
    "--admin-status-idle-bg": "var(--page-panel-strong-bg)",
    "--admin-status-idle-border": "var(--theme-colors-border)",
    "--admin-status-idle-color": "var(--theme-colors-text-strong)",
    "--admin-chip-bg": "var(--page-panel-bg)",
    "--admin-chip-border": "var(--theme-colors-border)",
    "--admin-chip-color": "var(--theme-colors-text-strong)",
    "--admin-chip-selected-bg": "var(--page-panel-strong-bg)",
    "--admin-chip-selected-border": "var(--theme-colors-border-strong)",
    "--admin-chip-selected-color": "var(--theme-colors-text-strong)",
    "--select-bg": "var(--muted-field-bg)",
    "--select-color": "var(--theme-colors-text-strong)",
    "--select-border": "var(--theme-colors-border)",
    "--select-border-focus": "var(--theme-colors-border-strong)",
    "--select-arrow-color": "var(--theme-colors-text-strong)",
  };

  for (const key of themePaletteSurfaceKeys) {
    const value = themePalette?.[key];
    if (value) {
      themeStyle[themePaletteSurfaceCssVarMap[key]] = value;
    }
  }

  return themeStyle;
};

export function buildThemeStyle(tokens: Record<string, unknown> | undefined, themePalette?: ThemePalette) {
  if (!themePalette || Object.keys(themePalette).length === 0) {
    return flattenThemeTokens(tokens) as CSSProperties;
  }

  const mergedTokens = {
    ...tokens,
    colors: {
      ...(tokens?.colors && typeof tokens.colors === "object"
        ? (tokens.colors as Record<string, unknown>)
        : {}),
      ...themePalette,
    },
  };

  return {
    ...flattenThemeTokens(mergedTokens),
    ...derivedThemeStyle(themePalette),
  } as CSSProperties;
}
