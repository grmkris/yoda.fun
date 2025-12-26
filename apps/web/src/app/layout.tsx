import type { Metadata } from "next";
import { Fredoka, Nunito, Righteous } from "next/font/google";
import { headers } from "next/headers";
import "../index.css";
import Script from "next/script";
import Header from "@/components/header";
import Providers from "@/components/providers";
import { AppSidebar } from "@/components/sidebar/sidebar";
import { SidebarProvider } from "@/components/sidebar/sidebar-context";
import { authClient } from "@/lib/auth-client";

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
  title: "yoda.fun - AI Prediction Markets",
  description:
    "Bet on real-world outcomes with AI-generated markets. Sports, politics, crypto, and more.",
  openGraph: {
    title: "yoda.fun - AI Prediction Markets",
    description:
      "Bet on real-world outcomes with AI-generated markets. Sports, politics, crypto, and more.",
    images: ["/api/og"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "yoda.fun - AI Prediction Markets",
    description:
      "Bet on real-world outcomes with AI-generated markets. Sports, politics, crypto, and more.",
    images: ["/api/og"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const reqHeaders = await headers();
  const response = await authClient
    .getSession({
      fetchOptions: { headers: reqHeaders },
    })
    .catch(() => null);

  // Create anonymous session if none exists
  if (!response?.data) {
    await authClient.signIn
      .anonymous({
        fetchOptions: { headers: reqHeaders },
      })
      .catch(() => null);
  }

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
      </head>
      <body
        className={`${fredoka.variable} ${nunito.variable} ${righteous.variable} antialiased`}
      >
        <Providers>
          <SidebarProvider>
            <div className="flex h-svh bg-cosmic-subtle">
              <AppSidebar />
              <div className="flex flex-1 flex-col overflow-hidden">
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
