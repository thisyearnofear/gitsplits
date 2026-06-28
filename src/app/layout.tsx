import type { Metadata, Viewport } from "next";
import { Instrument_Serif, JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";

import { headers } from "next/headers";
import ContextProvider from "@/context";
import BitteWalletProvider from "@/components/near/BitteWalletProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/notifications/ToastProvider";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GitSplits — Enterprise OSS Funding, Orchestrated",
  description: "A UiPath Maestro Case for enterprise open-source funding. Agents handle routine work autonomously; humans approve only the high-impact decisions.",
  keywords: ["UiPath", "Maestro", "open source", "OSS funding", "agents", "orchestration", "AgentHack"],
  authors: [{ name: "papa" }],
  openGraph: {
    title: "GitSplits — Enterprise OSS Funding, Orchestrated",
    description: "A UiPath Maestro Case for enterprise OSS funding. End-to-end orchestrated with humans accountable for high-impact decisions.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GitSplits — Enterprise OSS Funding, Orchestrated",
    description: "A UiPath Maestro Case for enterprise OSS funding.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a0b0d" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0d" },
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
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${mono.variable} ${body.variable}`}>
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
