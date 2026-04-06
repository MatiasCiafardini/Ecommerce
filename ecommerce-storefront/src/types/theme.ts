import type { ThemeBlockDefinition } from "@/types/block";
import type { StorefrontThemeLayout } from "@/types/storefront-config";

export const themePaletteColorKeys = [
  "background",
  "backgroundSoft",
  "backgroundElevated",
  "paper",
  "paperMuted",
  "text",
  "textMuted",
  "textStrong",
  "border",
  "borderStrong",
  "accent",
  "accentStrong",
  "accentContrast",
] as const;

export const themePaletteSurfaceKeys = [
  "pageShellBg",
  "storeShellBg",
  "pagePanelBg",
  "pagePanelStrongBg",
  "mutedFieldBg",
  "blockCardBg",
  "blockPanelBg",
  "testimonialCardBg",
  "testimonialCardFeaturedBg",
  "newsletterShellBg",
  "accountShellBg",
  "accountSidebarBg",
  "accountGroupBg",
  "accountItemBg",
  "accountItemBgActive",
  "accountItemBorder",
  "accountItemBorderActive",
] as const;

export const themePaletteKeys = [...themePaletteColorKeys, ...themePaletteSurfaceKeys] as const;

export type ThemePaletteColorKey = (typeof themePaletteColorKeys)[number];
export type ThemePaletteSurfaceKey = (typeof themePaletteSurfaceKeys)[number];
export type ThemePaletteKey = (typeof themePaletteKeys)[number];

export type ThemePalette = Partial<Record<ThemePaletteKey, string>>;

export const themePaletteSurfaceCssVarMap: Record<ThemePaletteSurfaceKey, string> = {
  pageShellBg: "--page-shell-bg",
  storeShellBg: "--store-shell-bg",
  pagePanelBg: "--page-panel-bg",
  pagePanelStrongBg: "--page-panel-strong-bg",
  mutedFieldBg: "--muted-field-bg",
  blockCardBg: "--block-card-bg",
  blockPanelBg: "--block-panel-bg",
  testimonialCardBg: "--testimonial-card-bg",
  testimonialCardFeaturedBg: "--testimonial-card-featured-bg",
  newsletterShellBg: "--newsletter-shell-bg",
  accountShellBg: "--account-shell-bg",
  accountSidebarBg: "--account-sidebar-bg",
  accountGroupBg: "--account-group-bg",
  accountItemBg: "--account-item-bg",
  accountItemBgActive: "--account-item-bg-active",
  accountItemBorder: "--account-item-border",
  accountItemBorderActive: "--account-item-border-active",
};

export type Theme = {
  name: string;
  className: string;
  Header?: React.ComponentType<{ themeLayout?: StorefrontThemeLayout }>;
  Footer?: React.ComponentType<{ themeLayout?: StorefrontThemeLayout }>;
  tokens?: Record<string, unknown>;
  blocks?: Record<string, ThemeBlockDefinition | undefined>;
};
