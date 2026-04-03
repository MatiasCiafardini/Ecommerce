import { headers } from "next/headers";
import { resolveStoreIdFromHost } from "@/lib/tenant/store-context";

function pickRequestHost(requestHeaders: Headers) {
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost || requestHeaders.get("host");

  return host?.split(",")[0]?.trim() ?? "";
}

export async function getServerStoreContext() {
  const requestHeaders = await headers();
  const host = pickRequestHost(requestHeaders);
  const storeId = resolveStoreIdFromHost(host);

  return {
    host,
    storeId,
  };
}
