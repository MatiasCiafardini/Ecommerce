import { getServerStoreContext } from "@/lib/tenant/server-store-context";
import { getPublicApiUrl } from "@/lib/runtime-config";

type ApiFetchOptions = {
  cache?: RequestCache;
  revalidate?: number;
  headers?: HeadersInit;
};

export const PUBLIC_REVALIDATE = {
  storefrontConfig: 600,
  categories: 600,
  products: 300,
  productDetail: 600,
  productOptions: 600,
  paymentConfig: 300,
} as const;

async function readResponseBody(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function extractServerErrorMessage(responseBody: string, fallback = "No se pudo cargar la informacion.") {
  if (!responseBody || responseBody === "<empty>") return fallback;

  try {
    const parsed = JSON.parse(responseBody) as { message?: string | string[] };
    if (Array.isArray(parsed.message) && parsed.message.length) {
      return parsed.message.join(", ");
    }
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message;
    }
  } catch {
    // Fall back to a generic user-facing message below.
  }

  return fallback;
}

export async function apiFetch<T>(
  path: string,
  options?: ApiFetchOptions,
): Promise<T | null> {
  const apiUrl = getPublicApiUrl();

  if (!apiUrl) {
    throw new Error("No se pudo conectar con el servidor.");
  }

  const { host, storeId, isPreview } = await getServerStoreContext();
  let response: Response;

  try {
    response = await fetch(`${apiUrl}${path}`, {
      headers: {
        "x-store-id": String(storeId),
        ...(!isPreview ? { "x-store-host": host } : {}),
        ...options?.headers,
      },
      cache: options?.cache ?? "no-store",
      next:
        typeof options?.revalidate === "number"
          ? { revalidate: options.revalidate }
          : undefined,
    });
  } catch (error) {
    throw new Error("No se pudo conectar con el servidor.");
  }

  if (!response.ok) {
    const responseBody = (await readResponseBody(response)).slice(0, 1000) || "<empty>";
    throw new Error(extractServerErrorMessage(responseBody));
  }

  if (response.status === 204) {
    return null;
  }

  const text = await readResponseBody(response);

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error("No se pudo leer la respuesta del servidor.");
  }
}
