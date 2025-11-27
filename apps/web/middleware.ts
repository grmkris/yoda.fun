import { SERVICE_URLS } from "@yoda.fun/shared/services";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { env } from "@/env";

const services = SERVICE_URLS[env.NEXT_PUBLIC_ENV];
const PH_PREFIX_REGEX = /^\/_ph/;

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  // Only handle PostHog proxy routes
  if (!url.pathname.startsWith("/_ph")) {
    return NextResponse.next();
  }

  const isStaticAsset = url.pathname.startsWith("/_ph/static/");
  const hostname = new URL(
    isStaticAsset ? services.posthogAssets : services.posthog
  ).hostname;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("host", hostname);

  url.protocol = "https";
  url.hostname = hostname;
  url.port = "443";
  url.pathname = url.pathname.replace(PH_PREFIX_REGEX, "");

  return NextResponse.rewrite(url, {
    headers: requestHeaders,
  });
}

export const config = {
  matcher: "/_ph/:path*",
};
