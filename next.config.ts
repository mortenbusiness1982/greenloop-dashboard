import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep local checkouts inside a larger workspace from watching its entire tree.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
