import type { ThemePalette } from "@/types/theme";

// Public storefront only. Keep the saved palette for internal workspaces.
const colors = {
  white: "#FCFBF8",
  linen: "#F5F1EA",
  sage: "#DCE9E3",
  green: "#73B5A5",
  botanical: "#31473E",
  ink: "#282521",
  // Slightly darker than #756F68 to retain AA contrast on the linen sections.
  muted: "#716B64",
  border: "#E7E0D7",
};

export const storefrontPalette: ThemePalette = {
  background: colors.white,
  backgroundSoft: colors.linen,
  backgroundElevated: colors.sage,
  paper: colors.white,
  paperMuted: colors.linen,
  text: colors.ink,
  textStrong: colors.ink,
  textMuted: colors.muted,
  border: colors.border,
  borderStrong: colors.botanical,
  accent: colors.green,
  accentStrong: colors.botanical,
  accentContrast: colors.white,
  pageShellBg: colors.white,
  storeShellBg: colors.white,
  pagePanelBg: colors.white,
  pagePanelStrongBg: colors.sage,
  mutedFieldBg: colors.white,
  blockCardBg: colors.white,
  blockPanelBg: colors.linen,
  testimonialCardBg: colors.white,
  testimonialCardFeaturedBg: colors.sage,
  newsletterShellBg: colors.linen,
};
