import { headers } from "next/headers";
import { parseHostStoreMap, resolveStoreIdFromHost } from "@/lib/tenant/store-context";

function pickRequestHost(requestHeaders: Headers) {
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost || requestHeaders.get("host");

  return host?.split(",")[0]?.trim() ?? "";
}

export async function getServerStoreContext() {
  const requestHeaders = await headers();
  const host = pickRequestHost(requestHeaders);
  const rawForwardedHost = requestHeaders.get("x-forwarded-host");
  const rawHost = requestHeaders.get("host");

  try {
    const storeId = resolveStoreIdFromHost(host);

    return {
      host,
      storeId,
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
