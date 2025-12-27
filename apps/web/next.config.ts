import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@takumi-rs/image-response"],
  typedRoutes: true,
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9100",
      },
      {
        protocol: "https",
        hostname: "storage.yoda.fun",
      },
    ],
  },
};

export default nextConfig;
