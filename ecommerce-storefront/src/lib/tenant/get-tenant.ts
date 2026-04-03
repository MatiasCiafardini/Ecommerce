import { apiFetch } from "@/services/api-client";
import { getServerStoreContext } from "@/lib/tenant/server-store-context";
import { getSafeStorefrontConfig } from "@/lib/tenant/storefront-defaults";
import type { Block } from "@/types/block";
import type { ThemePalette } from "@/types/theme";

type RemoteStorefrontConfig = {
  theme?: string;
  themePalette?: ThemePalette;
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
}
