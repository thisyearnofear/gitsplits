import type { Metadata } from "next";
import "./globals.css";

import { headers } from "next/headers";
import ContextProvider from "@/context";
import BitteWalletProvider from "@/components/near/BitteWalletProvider";
import SessionClientProvider from "@/components/SessionClientProvider";

export const metadata: Metadata = {
  title: "Gitsplits",
  description: "A tool for celebrating open source contributions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookies = headers().get("cookie");

  return (
    <html lang="en">
      <body>
        <SessionClientProvider>
          <ContextProvider cookies={cookies}>
            <BitteWalletProvider>{children}</BitteWalletProvider>
          </ContextProvider>
        </SessionClientProvider>
      </body>
    </html>
  );
}
