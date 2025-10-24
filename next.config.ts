import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Disable x-powered-by header for security
  poweredByHeader: false,
  // Enable React strict mode
  reactStrictMode: true,
};

export default nextConfig;
