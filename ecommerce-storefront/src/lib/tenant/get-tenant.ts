import { headers } from "next/headers";
import { apiFetch } from "@/services/api-client";
import { resolveStoreIdFromHost } from "@/lib/tenant/store-context";
import { getDefaultStorefrontConfig } from "@/lib/tenant/storefront-defaults";
import type { Block } from "@/types/block";

type RemoteStorefrontConfig = {
  theme?: string;
  pages?: {
    home?: Block[];
  };
};

export async function getTenantConfig() {
  const requestHeaders = await headers();
  const storeId = resolveStoreIdFromHost(requestHeaders.get("host"));
  const fallbackConfig = getDefaultStorefrontConfig(storeId);

  if (!fallbackConfig) {
    throw new Error(`Missing storefront page config for store ${storeId}`);
  }

  const remoteConfig = await apiFetch<{
    theme?: string | null;
    storefrontConfig?: RemoteStorefrontConfig | null;
  }>("/store/config", {
    cache: "force-cache",
    revalidate: 60,
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
    pages: {
      home:
        remoteHome && remoteHome.length > 0
          ? remoteHome
          : fallbackConfig.pages.home,
    },
  };
}
