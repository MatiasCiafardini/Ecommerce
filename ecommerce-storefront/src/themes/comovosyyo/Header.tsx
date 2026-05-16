"use client";

import "./styles/index.css";
import { BrandedHeader } from "@/themes/milashoes/Header";
import type { StorefrontThemeLayout } from "@/types/storefront-config";

export default function Header({
  themeLayout,
}: {
  themeLayout?: StorefrontThemeLayout;
}) {
  return (
    <BrandedHeader
      themeLayout={themeLayout}
      themeName="comovosyyo"
      logoSrc="/images/comovosyyo/logo.png"
      logoAlt="Como Vos y Yo"
      logoDesktopWidth={148}
      logoMobileWidth={108}
    />
  );
}
