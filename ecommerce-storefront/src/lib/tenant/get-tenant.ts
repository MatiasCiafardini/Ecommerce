import { apiFetch } from "@/services/api-client";
import { getServerStoreContext } from "@/lib/tenant/server-store-context";
import { getDefaultStorefrontConfig } from "@/lib/tenant/storefront-defaults";
import type { Block } from "@/types/block";
import type { ThemePalette } from "@/types/theme";

type RemoteStorefrontConfig = {
  theme?: string;
  themePalette?: ThemePalette;
  pages?: {
    home?: Block[];
  };
};

export async function getTenantConfig() {
  const { host, storeId } = await getServerStoreContext();
  const fallbackConfig = getDefaultStorefrontConfig(storeId);

  if (!fallbackConfig) {
    throw new Error(`Missing storefront page config for store ${storeId} (host="${host}")`);
  }

  const remoteConfig = await apiFetch<{
    theme?: string | null;
    storefrontConfig?: RemoteStorefrontConfig | null;
  }>("/store/config", {
    cache: "no-store",
  });

  const remoteHome = Array.isArray(remoteConfig?.storefrontConfig?.pages?.home)
    ? remoteConfig?.storefrontConfig?.pages?.home
    : null;

  return {
    storeId,
    theme:
      remoteConfig?.storefrontConfig?.theme ||
      remoteConfig?.theme ||
      fallbackConfig.theme,
    themePalette:
      remoteConfig?.storefrontConfig?.themePalette ??
      fallbackConfig.themePalette,
    pages: {
      home:
        remoteHome && remoteHome.length > 0
          ? remoteHome
          : fallbackConfig.pages.home,
    },
  };
}
