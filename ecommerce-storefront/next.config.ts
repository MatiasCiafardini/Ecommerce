import type { NextConfig } from "next";

const remotePatterns = (() => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

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
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
