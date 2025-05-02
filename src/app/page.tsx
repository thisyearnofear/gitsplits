"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useAppKitAccount, useAppKit } from "@reown/appkit/react";
import Header from "@/components/shared/Header";
import { HomeProps, LandingPageProps } from "@/types";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNearWallet } from "@/hooks/useNearWallet";

const LandingPage = dynamic(() => import("@/components/landing/LandingPage"), {
  ssr: false,
});

const Home: React.FC<HomeProps> = () => {
  const { isConnected: isEvmConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const { isConnected: isNearConnected } = useNearWallet();

  // Combined connection status - connected to either wallet
  const isAnyWalletConnected = isEvmConnected || isNearConnected;

  const handleLoginPrompt = () => {
    if (!isEvmConnected) {
      open(); // This opens the modal for connecting to EVM wallet
    }
  };

  const landingPageProps: LandingPageProps = {
    isConnected: isEvmConnected,
    onDashboardClick: () => {}, // No-op, dashboard is now a separate route
    onLoginPrompt: handleLoginPrompt,
  };

  return (
    <TooltipProvider>
      <Header />
      <Suspense fallback={<div>Loading...</div>}>
        <LandingPage {...landingPageProps} />
      </Suspense>
    </TooltipProvider>
  );
};

export default Home;
