import { cookies, headers } from "next/headers";
import {
  isPlatformPreviewHost,
  parseHostStoreMap,
  parsePreviewStoreId,
  PREVIEW_STORE_COOKIE,
  resolveStoreIdFromHost,
} from "@/lib/tenant/store-context";

function pickRequestHost(requestHeaders: Headers) {
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost || requestHeaders.get("host");

  return host?.split(",")[0]?.trim() ?? "";
}

export async function getServerStoreContext() {
  const requestHeaders = await headers();
  const requestCookies = await cookies();
  const host = pickRequestHost(requestHeaders);
  const rawForwardedHost = requestHeaders.get("x-forwarded-host");
  const rawHost = requestHeaders.get("host");

  try {
    const previewStoreId = isPlatformPreviewHost(host)
      ? parsePreviewStoreId(requestCookies.get(PREVIEW_STORE_COOKIE)?.value)
      : null;
    const storeId = previewStoreId ?? resolveStoreIdFromHost(host);

    return {
      host,
      storeId,
      isPreview: Boolean(previewStoreId),
    };
  } catch (error) {
    console.error("[tenant] Failed to resolve store from request host", {
      host,
      rawForwardedHost,
      rawHost,
      configuredHosts: Object.keys(parseHostStoreMap()).sort(),
    });

    throw error;
  }
}
