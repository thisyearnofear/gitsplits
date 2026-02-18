import type { Metadata, Viewport } from "next";
import "./globals.css";

import { headers } from "next/headers";
import ContextProvider from "@/context";
import BitteWalletProvider from "@/components/near/BitteWalletProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/notifications/ToastProvider";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";

export const metadata: Metadata = {
  title: "Gitsplits - Pay Open Source Contributors",
  description: "A tool for celebrating open source contributions. Analyze GitHub repositories, get fair split suggestions based on actual contributions, and distribute payments to contributors automatically.",
  keywords: ["open source", "github", "payments", "contributors", "splits", "crypto", "NEAR", "blockchain"],
  authors: [{ name: "papa" }],
  openGraph: {
    title: "Gitsplits - Pay Open Source Contributors",
    description: "Analyze GitHub repositories and distribute payments to contributors automatically.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gitsplits - Pay Open Source Contributors",
    description: "Analyze GitHub repositories and distribute payments to contributors automatically.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E8F4FD" },
    { media: "(prefers-color-scheme: dark)", color: "#0F172A" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookies = headers().get("cookie");

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ErrorBoundary>
          <ThemeProvider defaultTheme="system" storageKey="gitsplits-theme">
            <ToastProvider>
              <ContextProvider cookies={cookies}>
                <BitteWalletProvider>{children}</BitteWalletProvider>
              </ContextProvider>
            </ToastProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
