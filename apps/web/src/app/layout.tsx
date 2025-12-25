import type { Metadata } from "next";
import { Fredoka, Nunito, Righteous } from "next/font/google";
import "../index.css";
import Header from "@/components/header";
import Providers from "@/components/providers";
import { AppSidebar } from "@/components/sidebar/sidebar";
import { SidebarProvider } from "@/components/sidebar/sidebar-context";

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
  title: "yoda.fun",
  description: "yoda.fun",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
