import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(process.cwd()),
  turbopack: {
    root: path.join(process.cwd()),
  },
};

export default nextConfig;
