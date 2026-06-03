import type { NextConfig } from "next";

function normalizeApiUrl(rawUrl?: string) {
  const value = rawUrl?.trim();

  if (!value) {
    return "";
  }

  return value.replace(/\/+$/, "");
}

const FALLBACK_API_HOSTNAME = "api.estudiosmc.cloud";
const ALLOWED_IMAGE_HOSTS = ["images.pexels.com"];

const remotePatterns = (() => {
  const patterns: { protocol: "http" | "https"; hostname: string; port: string; pathname: string }[] = [];

  const apiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);
  if (apiUrl) {
    try {
      const parsed = new URL(apiUrl);
      patterns.push({
        protocol: parsed.protocol.replace(":", "") as "http" | "https",
        hostname: parsed.hostname,
        port: parsed.port,
        pathname: "/uploads/**",
      });
    } catch {
      // ignore malformed URL
    }
  }

  // Always include the production API host so optimization works even when
  // NEXT_PUBLIC_API_URL is not explicitly set in the environment.
  const alreadyIncluded = patterns.some((p) => p.hostname === FALLBACK_API_HOSTNAME);
  if (!alreadyIncluded) {
    patterns.push({
      protocol: "https",
      hostname: FALLBACK_API_HOSTNAME,
      port: "",
      pathname: "/uploads/**",
    });
  }

  for (const hostname of ALLOWED_IMAGE_HOSTS) {
    if (patterns.some((p) => p.hostname === hostname)) {
      continue;
    }

    patterns.push({
      protocol: "https",
      hostname,
      port: "",
      pathname: "/**",
    });
  }

  return patterns;
})();

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DEV_DIST_DIR || ".next",
  poweredByHeader: false,
  images: {
    remotePatterns,
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
