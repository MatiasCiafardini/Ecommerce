function readRequiredEnv(name: string, fallback?: string) {
  const value = process.env[name]?.trim();

  if (value) {
    return value;
  }

  if (fallback) {
    return fallback;
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000/api";
  }

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

export function getPublicApiUrl() {
  return readRequiredEnv("NEXT_PUBLIC_API_URL");
}
