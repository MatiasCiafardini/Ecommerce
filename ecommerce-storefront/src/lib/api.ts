import { getClientStoreContext } from "@/lib/tenant/store-context";
import { getPublicApiUrl } from "@/lib/runtime-config";

type ApiOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
  signal?: AbortSignal;
  timeoutMs?: number;
};

const DEFAULT_API_TIMEOUT_MS = 45_000;

function buildApiHeaders(
  options: ApiOptions,
  storeId: number,
  storeHost: string,
  isPreview: boolean,
) {
  const isFormData = options.body instanceof FormData;

  return {
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    "x-store-id": String(storeId),
    ...(!isPreview ? { "x-store-host": storeHost } : {}),
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

const friendlyValidationMessages: Array<[RegExp, string]> = [
  [/email must be an email/i, "El email no tiene un formato valido."],
  [/phone must be a phone number/i, "El telefono no tiene un formato valido."],
  [/password must be longer than or equal to/i, "La contrasena es demasiado corta."],
  [/must be a string/i, "Revisa los datos ingresados."],
  [/must be a number/i, "Revisa los importes ingresados."],
  [/must be an integer number/i, "Revisa los numeros ingresados."],
  [/must not be empty/i, "Completa los campos obligatorios."],
  [/should not be empty/i, "Completa los campos obligatorios."],
  [/is not a valid enum value/i, "Selecciona una opcion valida."],
  [/Unauthorized/i, "Tu sesion vencio. Volve a iniciar sesion."],
  [/Forbidden/i, "No tenes permiso para realizar esta accion."],
  [/Inactive current account not found/i, "No encontramos una cuenta corriente dada de baja con esos datos."],
];

function cleanServerMessage(message: string) {
  const withoutApiPrefix = message
    .replace(/^API request failed(?:[^.]*)(?:\. Response body:\s*)?/i, "")
    .replace(/^Response body:\s*/i, "")
    .trim();

  return withoutApiPrefix || message;
}

export function getErrorMessage(error: unknown, fallback = "No se pudo completar la accion.") {
  const rawMessage = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const message = cleanServerMessage(rawMessage || fallback);
  const match = friendlyValidationMessages.find(([pattern]) => pattern.test(message));

  if (match) return match[1];

  if (!message || /^API request failed/i.test(message)) {
    return fallback;
  }

  return message;
}

const extractErrorMessage = async (res: Response) => {
  const text = await res.text();

  const fallback = res.status >= 500
    ? "El servidor tuvo un problema. Intentalo de nuevo en unos minutos."
    : "No se pudo completar la accion.";

  if (!text) {
    return fallback;
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

  return getErrorMessage(normalizedMessage, fallback);
};

function createTimeoutSignal(options: ApiOptions) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_API_TIMEOUT_MS;
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const abortFromCaller = () => controller.abort();
  options.signal?.addEventListener("abort", abortFromCaller, { once: true });

  return {
    signal: controller.signal,
    didTimeOut: () => timedOut,
    cleanup: () => {
      window.clearTimeout(timeoutId);
      options.signal?.removeEventListener("abort", abortFromCaller);
    },
  };
}

function timeoutErrorMessage() {
  return "La operacion tardo demasiado y se cancelo. Revisa si se guardo y volve a intentar.";
}

async function fetchWithTimeout(url: string, options: ApiOptions, init: RequestInit) {
  if (typeof window === "undefined") {
    return fetch(url, {
      ...init,
      signal: options.signal,
    });
  }

  const timeout = createTimeoutSignal(options);
  try {
    return await fetch(url, {
      ...init,
      signal: timeout.signal,
    });
  } catch (error) {
    if (timeout.didTimeOut()) {
      throw new Error(timeoutErrorMessage());
    }
    throw error;
  } finally {
    timeout.cleanup();
  }
}

export const api = async (endpoint: string, options: ApiOptions = {}) => {
  const apiUrl =
    typeof window === "undefined" ? getPublicApiUrl() : "/api/proxy";
  const { host, storeId, isPreview } = getClientStoreContext();

  const res = await fetchWithTimeout(`${apiUrl}${endpoint}`, options, {
    method: options.method || "GET",
    headers: buildApiHeaders(options, storeId, host, isPreview),
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
  const apiUrl =
    typeof window === "undefined" ? getPublicApiUrl() : "/api/proxy";
  const { host, storeId, isPreview } = getClientStoreContext();

  const res = await fetchWithTimeout(`${apiUrl}${endpoint}`, options, {
    method: options.method || "GET",
    headers: buildApiHeaders(options, storeId, host, isPreview),
    body: options.body,
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await extractErrorMessage(res));
  }

  return res.text();
};

export const apiBlob = async (endpoint: string, options: ApiOptions = {}) => {
  const apiUrl =
    typeof window === "undefined" ? getPublicApiUrl() : "/api/proxy";
  const { host, storeId, isPreview } = getClientStoreContext();

  const res = await fetchWithTimeout(`${apiUrl}${endpoint}`, options, {
    method: options.method || "GET",
    headers: buildApiHeaders(options, storeId, host, isPreview),
    body: options.body,
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await extractErrorMessage(res));
  }

  return res.blob();
};
