import { BrandedFooter } from "@/themes/milashoes/Footer";
import type { StorefrontThemeLayout } from "@/types/storefront-config";

export default function Footer({
  themeLayout,
}: {
  themeLayout?: StorefrontThemeLayout;
}) {
  return (
    <BrandedFooter
      themeLayout={themeLayout}
      themeName="comovosyyo"
      eyebrow="Como Vos y Yo"
    />
  );
}
