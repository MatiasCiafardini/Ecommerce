import { getClientStoreContext } from "@/lib/tenant/store-context";
import { getPublicApiUrl } from "@/lib/runtime-config";

type ApiOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
};

function buildApiHeaders(
  options: ApiOptions,
  storeId: number,
  storeHost: string,
) {
  const isFormData = options.body instanceof FormData;

  return {
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    "x-store-id": String(storeId),
    "x-store-host": storeHost,
    ...options.headers,
  };
}

const parseJsonIfPresent = async (res: Response) => {
  const text = await res.text();

  if (!text) {
    return null;
  }

  return JSON.parse(text);
};

const extractErrorMessage = async (res: Response) => {
  const text = await res.text();

  const fallback = `API request failed with status ${res.status} ${res.statusText}`;

  if (!text) {
    return `${fallback}. Response body: <empty>`;
  }

  let normalizedMessage = text;

  try {
    const errorData = JSON.parse(text) as { message?: string | string[] };

    if (Array.isArray(errorData.message)) {
      normalizedMessage = errorData.message.join(", ");
    } else if (typeof errorData.message === "string" && errorData.message.trim()) {
      normalizedMessage = errorData.message;
    }
  } catch {
    normalizedMessage = text;
  }

  return `${fallback}. Response body: ${normalizedMessage}`;
};

export const api = async (endpoint: string, options: ApiOptions = {}) => {
  const apiUrl = getPublicApiUrl();
  const { host, storeId } = getClientStoreContext();

  const res = await fetch(`${apiUrl}${endpoint}`, {
    method: options.method || "GET",
    headers: buildApiHeaders(options, storeId, host),
    body: options.body,
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await extractErrorMessage(res));
  }

  if (res.status === 204) return null;

  return parseJsonIfPresent(res);
};

export const apiText = async (endpoint: string, options: ApiOptions = {}) => {
  const apiUrl = getPublicApiUrl();
  const { host, storeId } = getClientStoreContext();

  const res = await fetch(`${apiUrl}${endpoint}`, {
    method: options.method || "GET",
    headers: buildApiHeaders(options, storeId, host),
    body: options.body,
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await extractErrorMessage(res));
  }

  return res.text();
};

export const apiBlob = async (endpoint: string, options: ApiOptions = {}) => {
  const apiUrl = getPublicApiUrl();
  const { host, storeId } = getClientStoreContext();

  const res = await fetch(`${apiUrl}${endpoint}`, {
    method: options.method || "GET",
    headers: buildApiHeaders(options, storeId, host),
    body: options.body,
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await extractErrorMessage(res));
  }

  return res.blob();
};
