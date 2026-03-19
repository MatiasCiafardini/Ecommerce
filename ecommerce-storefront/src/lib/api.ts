const API_URL = process.env.NEXT_PUBLIC_API_URL;

type ApiOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
};

export const api = async (endpoint: string, options: ApiOptions = {}) => {
  const token = localStorage.getItem("token");
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      "x-store-id": "1",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body,
  });

  if (!res.ok) {
    let errorMessage = "Error en la request";

    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      errorMessage = await res.text();
    }

    throw new Error(errorMessage);
  }

  if (res.status === 204) return null;

  return res.json();
};
