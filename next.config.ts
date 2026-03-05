import type { NextConfig } from "next";

const isProdBuild = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: isProdBuild ? "export" : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
