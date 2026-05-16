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

const MILASHOES_FAQ_BLOCK_TYPE = "milashoes_institutional";

function reportRemoteStorefrontFallback(args: {
  storeId: number;
  error: unknown;
}) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.warn("[tenant] Falling back to local storefront config", {
    storeId: args.storeId,
    error: args.error instanceof Error ? args.error.message : String(args.error),
  });
}

function withRequiredThemeBlocks(args: {
  storeId: number;
  theme: string;
  homeBlocks: Block[];
}) {
  const shouldAppendMilaShoesFaq =
    [6, 7].includes(args.storeId) &&
    ["milashoes", "comovosyyo"].includes(args.theme.trim().toLowerCase()) &&
    !args.homeBlocks.some((block) => block?.type === MILASHOES_FAQ_BLOCK_TYPE);

  if (!shouldAppendMilaShoesFaq) {
    return args.homeBlocks;
  }

  return [
    ...args.homeBlocks,
    {
      type: MILASHOES_FAQ_BLOCK_TYPE,
      props: {
        animationPreset: "soft",
      },
    },
  ];
}

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
  const theme = resolvedTheme || fallbackConfig.theme || "minimal";
  const home =
    remoteHome && remoteHome.length > 0
      ? remoteHome
      : fallbackConfig.pages.home;

  return {
    storeId: args.storeId,
    theme,
    themePalette:
      args.remoteConfig?.storefrontConfig?.themePalette ??
      fallbackConfig.themePalette,
    themeLayout: mergeThemeLayout(
      resolvedTheme || fallbackConfig.theme,
      args.remoteConfig?.storefrontConfig?.themeLayout,
    ),
    pages: {
      home: withRequiredThemeBlocks({
        storeId: args.storeId,
        theme,
        homeBlocks: home,
      }),
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
    reportRemoteStorefrontFallback({
      storeId,
      error,
    });

    return normalizeTenantConfig({
      storeId,
      remoteConfig: null,
    });
  }
}
