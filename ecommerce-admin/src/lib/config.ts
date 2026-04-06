const DEFAULT_API_URL = "https://api.estudiosmc.cloud/api";

export function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_API_URL;
}
