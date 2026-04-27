import type { Metadata } from "next";
import ThemeProvider from "@/engine/theme-provider/ThemeProvider";
import { getTenantConfig } from "@/lib/tenant/get-tenant";
import StoreShell from "@/components/store/StoreShell";

const themeFavicons: Record<string, string> = {
  trojani: "/images/trojani/iconos/logo.ico?v=20260427",
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

  return (
    <ThemeProvider
      themeName={config.theme}
      themePalette={config.themePalette}
      themeLayout={config.themeLayout}
    >
      <StoreShell themeName={config.theme}>{children}</StoreShell>
    </ThemeProvider>
  );
}
