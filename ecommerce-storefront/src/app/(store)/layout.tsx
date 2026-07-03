import type { Metadata } from "next";
import ThemeProvider from "@/engine/theme-provider/ThemeProvider";
import { getTenantConfig } from "@/lib/tenant/get-tenant";
import StoreShell from "@/components/store/StoreShell";
import MetaPixel from "@/components/store/MetaPixel";

const themeFavicons: Record<string, string> = {
  comovosyyo: "/images/comovosyyo/favicon.ico?v=20260603",
  trojani: "/images/trojani/iconos/logo.ico?v=20260427",
};

const metaPixelIdsByStoreId: Record<number, string> = {
  7: "1610683377067210",
};

export async function generateMetadata(): Promise<Metadata> {
  const config = await getTenantConfig();
  const icon = themeFavicons[config.theme];
  return icon
    ? {
        icons: {
          icon,
          shortcut: icon,
          apple: icon,
        },
      }
    : {};
}

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await getTenantConfig();
  const metaPixelId = metaPixelIdsByStoreId[config.storeId];

  return (
    <>
      {metaPixelId ? <MetaPixel pixelId={metaPixelId} /> : null}
      <ThemeProvider
        themeName={config.theme}
        themePalette={config.themePalette}
        themeLayout={config.themeLayout}
      >
        <StoreShell themeName={config.theme}>{children}</StoreShell>
      </ThemeProvider>
    </>
  );
}
