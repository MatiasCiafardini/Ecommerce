import { getServerStoreContext } from "@/lib/tenant/server-store-context";
import { getPublicApiUrl } from "@/lib/runtime-config";

const API_URL = getPublicApiUrl();

type ApiFetchOptions = {
  cache?: RequestCache;
  revalidate?: number;
  headers?: HeadersInit;
};

async function readResponseBody(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function apiFetch<T>(
  path: string,
  options?: ApiFetchOptions,
): Promise<T | null> {
  if (!API_URL) {
    throw new Error(`API request failed for ${path}: missing NEXT_PUBLIC_API_URL`);
  }

  const { host, storeId } = await getServerStoreContext();
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "x-store-id": String(storeId),
      ...options?.headers,
    },
    cache: options?.cache ?? "no-store",
    next:
      typeof options?.revalidate === "number"
        ? { revalidate: options.revalidate }
        : undefined,
  });

  if (!response.ok) {
    const responseBody = (await readResponseBody(response)).slice(0, 1000) || "<empty>";
    throw new Error(
      `API request failed for ${path} (host="${host}", storeId=${storeId}, status=${response.status} ${response.statusText}). Response body: ${responseBody}`,
    );
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
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `API request returned invalid JSON for ${path} (host="${host}", storeId=${storeId}). Parse error: ${message}. Response body: ${text.slice(0, 1000)}`,
    );
  }
}
