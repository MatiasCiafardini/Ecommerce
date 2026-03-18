const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export async function apiFetch(path: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "x-store-id": "1",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("API ERROR", res.status);
    return null;
  }

  const text = await res.text();

  if (!text) return null;

  return JSON.parse(text);
}
