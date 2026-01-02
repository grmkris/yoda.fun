import { type Environment, SERVICE_URLS } from "@yoda.fun/shared/services";
import type { NextConfig } from "next";

const currentEnv = (process.env.NEXT_PUBLIC_ENV || "dev") as Environment;

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@takumi-rs/image-response"],
  typedRoutes: true,
  reactCompiler: true,
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/ph/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ph/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
      // API proxy - routes to apiInternal (localhost:4200 in dev, api.internal:4200 in prod)
      {
        source: "/api/:path*",
        destination: `${SERVICE_URLS[currentEnv].api}/:path*`,
      },
    ];
  },
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
