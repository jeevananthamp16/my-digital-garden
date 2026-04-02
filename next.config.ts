import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Cloudflare Pages deployment
  output: 'standalone',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
