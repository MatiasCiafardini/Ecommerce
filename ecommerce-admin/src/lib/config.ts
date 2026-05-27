const DEFAULT_DEVELOPMENT_API_URL = "http://localhost:3000/api";
const DEFAULT_PRODUCTION_API_URL = "https://api.estudiosmc.cloud/api";

export function getApiUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  return process.env.NODE_ENV === "production" ? DEFAULT_PRODUCTION_API_URL : DEFAULT_DEVELOPMENT_API_URL;
}
