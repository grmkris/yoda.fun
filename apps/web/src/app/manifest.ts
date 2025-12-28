import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "yoda.fun",
    short_name: "yoda.fun",
    description: "See the future. Stake your claim. Win real money.",
    start_url: "/new",
    display: "standalone",
    background_color: "#0f0a1a",
    theme_color: "#8b5cf6",
    icons: [
      {
        src: "/favicon/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/favicon/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
