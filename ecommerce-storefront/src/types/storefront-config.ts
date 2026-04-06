import type { Block } from "@/types/block";
import type { ThemePalette } from "@/types/theme";

export type StorefrontNavLink = {
  label: string;
  href: string;
};

export type StorefrontFooterColumn = {
  title: string;
  links: StorefrontNavLink[];
};

export type StorefrontThemeLayout = {
  header?: {
    brandLabel?: string;
    primaryLinks?: StorefrontNavLink[];
  };
  footer?: {
    brandTitle?: string;
    brandSubtitle?: string;
    columns?: StorefrontFooterColumn[];
  };
};

export type StorefrontTenantConfig = {
  theme: string;
  themePalette?: ThemePalette;
  themeLayout?: StorefrontThemeLayout;
  pages: {
    home: Block[];
  };
};
