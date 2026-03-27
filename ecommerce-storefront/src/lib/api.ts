import { getClientStoreId } from "@/lib/tenant/store-context";
import { getPublicApiUrl } from "@/lib/runtime-config";
import { getScopedStorageItem } from "@/lib/store-browser-storage";

const API_URL = getPublicApiUrl();

type ApiOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
};

const parseJsonIfPresent = async (res: Response) => {
  const text = await res.text();

  if (!text) {
    return null;
  }

  return JSON.parse(text);
};

const extractErrorMessage = async (res: Response) => {
  const text = await res.text();

  if (!text) {
    return "Error en la request";
  }

  try {
    const errorData = JSON.parse(text) as { message?: string | string[] };
    if (Array.isArray(errorData.message)) {
      return errorData.message.join(", ");
    }

    return errorData.message || text;
  } catch {
    return text;
  }
};

export const api = async (endpoint: string, options: ApiOptions = {}) => {
  const token = getScopedStorageItem("token");
  const isFormData = options.body instanceof FormData;
  const storeId = getClientStoreId();

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      "x-store-id": String(storeId),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body,
  });

  if (!res.ok) {
    throw new Error(await extractErrorMessage(res));
  }

  if (res.status === 204) return null;

  return parseJsonIfPresent(res);
};

export const apiText = async (endpoint: string, options: ApiOptions = {}) => {
  const token = getScopedStorageItem("token");
  const isFormData = options.body instanceof FormData;
  const storeId = getClientStoreId();

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      "x-store-id": String(storeId),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body,
  });

  if (!res.ok) {
    throw new Error(await extractErrorMessage(res));
  }

  return res.text();
};
