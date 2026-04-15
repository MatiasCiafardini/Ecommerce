import type { NextConfig } from "next";

function normalizeApiUrl(rawUrl?: string) {
  const value = rawUrl?.trim();

  if (!value) {
    return "";
  }

  return value.replace(/\/+$/, "");
}

const remotePatterns = (() => {
  const apiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

  if (!apiUrl) {
    return [];
  }

  try {
    const parsed = new URL(apiUrl);
    return [
      {
        protocol: parsed.protocol.replace(":", "") as "http" | "https",
        hostname: parsed.hostname,
        port: parsed.port,
        pathname: "/uploads/**",
      },
    ];
  } catch {
    return [];
  }
})();

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DEV_DIST_DIR || ".next",
  poweredByHeader: false,
  images: {
    remotePatterns,
  },
  async rewrites() {
    const apiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

    if (!apiUrl) {
      return [];
    }

    return [
      {
        source: "/api/proxy/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
