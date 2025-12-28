import type { Metadata } from "next";
import { Fredoka, Nunito, Righteous } from "next/font/google";
import "../index.css";
import { SERVICE_URLS } from "@yoda.fun/shared/services";
import Script from "next/script";
import Header from "@/components/header";
import { MiniAppReady } from "@/components/miniapp-ready";
import Providers from "@/components/providers";
import { AppSidebar } from "@/components/sidebar/sidebar";
import { SidebarProvider } from "@/components/sidebar/sidebar-context";
import { TopBar } from "@/components/top-bar";
import { env } from "@/env";

const fredoka = Fredoka({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const righteous = Righteous({
  variable: "--font-accent",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SERVICE_URLS[env.NEXT_PUBLIC_ENV].web),
  title: "yoda.fun — See the Future, Stake Your Claim",
  description:
    "The future is tradeable. Pick your side on sports, crypto, politics, and culture. Win real money when you're right. Instant payouts.",
  openGraph: {
    title: "yoda.fun — See the Future, Stake Your Claim",
    description:
      "The future is tradeable. Pick your side on sports, crypto, politics, and culture. Win real money when you're right. Instant payouts.",
    images: ["/api/og"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "yoda.fun — See the Future, Stake Your Claim",
    description:
      "The future is tradeable. Pick your side on sports, crypto, politics, and culture. Win real money when you're right. Instant payouts.",
    images: ["/api/og"],
  },
  other: {
    "fc:miniapp": JSON.stringify({
      version: "next",
      imageUrl: "https://yoda.fun/api/og",
      button: {
        title: "Launch yoda.fun",
        action: {
          type: "launch_miniapp",
          name: "yoda.fun",
          url: "https://yoda.fun",
          splashImageUrl: "https://yoda.fun/splash.png",
          splashBackgroundColor: "#0f0a1a",
        },
      },
    }),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            crossOrigin="anonymous"
            src="//unpkg.com/react-grab/dist/index.global.js"
            strategy="beforeInteractive"
          />
        )}
        <meta content="69519aadc63ad876c9081746" name="base:app_id" />
      </head>
      <body
        className={`${fredoka.variable} ${nunito.variable} ${righteous.variable} antialiased`}
      >
        <Providers>
          <MiniAppReady />
          <SidebarProvider>
            <div className="flex h-svh bg-cosmic-subtle">
              <AppSidebar />
              <div className="flex flex-1 flex-col overflow-hidden">
                <TopBar />
                <Header />
                <main className="flex-1 overflow-auto">{children}</main>
              </div>
            </div>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}
