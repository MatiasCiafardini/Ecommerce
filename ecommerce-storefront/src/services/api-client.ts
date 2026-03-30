import { headers } from "next/headers";
import { resolveStoreIdFromHost } from "@/lib/tenant/store-context";
import { getPublicApiUrl } from "@/lib/runtime-config";

const API_URL = getPublicApiUrl();

type ApiFetchOptions = {
  cache?: RequestCache;
  revalidate?: number;
};

export async function apiFetch<T>(
  path: string,
  options?: ApiFetchOptions,
): Promise<T | null> {
  if (!API_URL) {
    console.error("API ERROR missing NEXT_PUBLIC_API_URL", { path });
    return null;
  }

  try {
    const requestHeaders = await headers();
    const storeId = resolveStoreIdFromHost(requestHeaders.get("host"));

    const res = await fetch(`${API_URL}${path}`, {
      headers: {
        "x-store-id": String(storeId),
      },
      cache: options?.cache ?? "no-store",
      next:
        typeof options?.revalidate === "number"
          ? { revalidate: options.revalidate }
          : undefined,
    });

    if (!res.ok) {
      const responsePreview = await res.text().catch(() => "");
      console.error("API ERROR", {
        path,
        status: res.status,
        statusText: res.statusText,
        storeId,
        apiUrl: API_URL,
        responsePreview: responsePreview.slice(0, 300),
      });
      return null;
    }

    const text = await res.text();

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text) as T;
    } catch (error) {
      console.error("API ERROR invalid JSON", {
        path,
        text: text.slice(0, 180),
        error,
      });
      return null;
    }
  } catch (error) {
    console.error("API ERROR request failed", {
      path,
      error,
    });
    return null;
  }
}
