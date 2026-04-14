import { apiFetch } from "@/services/api-client";
import { getServerStoreContext } from "@/lib/tenant/server-store-context";
import { getSafeStorefrontConfig } from "@/lib/tenant/storefront-defaults";
import { mergeThemeLayout } from "@/lib/tenant/theme-layout-defaults";
import type { Block } from "@/types/block";
import type { ThemePalette } from "@/types/theme";
import type { StorefrontThemeLayout } from "@/types/storefront-config";

type RemoteStorefrontConfig = {
  theme?: string;
  themePalette?: ThemePalette;
  themeLayout?: StorefrontThemeLayout;
  pages?: {
    home?: Block[];
  };
};

function normalizeTenantConfig(args: {
  storeId: number;
  remoteConfig: {
    theme?: string | null;
    storefrontConfig?: RemoteStorefrontConfig | null;
  } | null;
}) {
  const resolvedTheme =
    args.remoteConfig?.storefrontConfig?.theme ||
    args.remoteConfig?.theme ||
    null;
  const fallbackConfig = getSafeStorefrontConfig(args.storeId, resolvedTheme);
  const remoteHome = Array.isArray(args.remoteConfig?.storefrontConfig?.pages?.home)
    ? args.remoteConfig.storefrontConfig.pages.home
    : null;

  return {
    storeId: args.storeId,
    theme:
      resolvedTheme ||
      fallbackConfig.theme ||
      "minimal",
    themePalette:
      args.remoteConfig?.storefrontConfig?.themePalette ??
      fallbackConfig.themePalette,
    themeLayout: mergeThemeLayout(
      resolvedTheme || fallbackConfig.theme,
      args.remoteConfig?.storefrontConfig?.themeLayout,
    ),
    pages: {
      home:
        remoteHome && remoteHome.length > 0
          ? remoteHome
          : fallbackConfig.pages.home,
    },
  };
}

export async function getTenantConfig() {
  const { storeId } = await getServerStoreContext();

  try {
    const remoteConfig = await apiFetch<{
      theme?: string | null;
      storefrontConfig?: RemoteStorefrontConfig | null;
    }>("/store/config", {
      cache: "no-store",
    });

    return normalizeTenantConfig({
      storeId,
      remoteConfig,
    });
  } catch (error) {
    console.error("[tenant] Failed to load remote storefront config", {
      storeId,
      error: error instanceof Error ? error.message : String(error),
    });

    return normalizeTenantConfig({
      storeId,
      remoteConfig: null,
    });
  }
}
