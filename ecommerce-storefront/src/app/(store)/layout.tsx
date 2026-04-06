import ThemeProvider from "@/engine/theme-provider/ThemeProvider";
import { getTenantConfig } from "@/lib/tenant/get-tenant";
import StoreShell from "@/components/store/StoreShell";

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
      <StoreShell>{children}</StoreShell>
    </ThemeProvider>
  );
}
