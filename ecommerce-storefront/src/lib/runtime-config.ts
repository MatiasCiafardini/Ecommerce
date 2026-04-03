const DEFAULT_PRODUCTION_API_URL = "https://api.estudiosmc.cloud/api";
const DEFAULT_DEVELOPMENT_API_URL = "http://localhost:3000/api";

function readEnvValue(name: string) {
  return process.env[name]?.trim() || "";
}

export function getApiUrl() {
  const configuredUrl = readEnvValue("NEXT_PUBLIC_API_URL");

  if (configuredUrl) {
    return configuredUrl;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEFAULT_DEVELOPMENT_API_URL;
  }

  return DEFAULT_PRODUCTION_API_URL;
}

export function getPublicApiUrl() {
  return getApiUrl();
}
