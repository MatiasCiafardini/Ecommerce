import { getServerStoreContext } from "@/lib/tenant/server-store-context";
import { getPublicApiUrl } from "@/lib/runtime-config";

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
  const apiUrl = getPublicApiUrl();

  if (!apiUrl) {
    throw new Error(`API request failed for ${path}: missing NEXT_PUBLIC_API_URL`);
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
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(
      `API network request failed for ${path} (host="${host}", storeId=${storeId}, apiUrl="${apiUrl}"). ${message}`,
    );
  }

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
