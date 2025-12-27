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
        hostname: "minio-eg4wkg0480c04og400osksws.37.60.232.68.sslip.io",
      },
      {
        protocol: "https",
        hostname: "storage.yoda.fun",
      },
    ],
  },
};

export default nextConfig;
