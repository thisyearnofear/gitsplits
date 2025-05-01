"use client";

import { Suspense, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAppKitAccount, useAppKit } from "@reown/appkit/react";
import Header from "@/components/shared/Header";
import { HomeProps, LandingPageProps } from "@/types";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNearWallet } from "@/hooks/useNearWallet";

const LandingPage = dynamic(() => import("@/components/landing/LandingPage"), {
  ssr: false,
});
const Dashboard = dynamic(() => import("@/components/dashboard/Dashboard"), {
  ssr: false,
});

const Home: React.FC<HomeProps> = () => {
  const { isConnected: isEvmConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const { isConnected: isNearConnected } = useNearWallet();
  const [isGitHubConnected, setIsGitHubConnected] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  // Combined connection status - connected to either wallet
  const isAnyWalletConnected = isEvmConnected || isNearConnected;

  // Check if user is already connected to any wallet on initial load
  useEffect(() => {
    if (isAnyWalletConnected && !showDashboard) {
      console.log("Wallet already connected, showing dashboard");
      console.log("EVM connected:", isEvmConnected);
      console.log("NEAR connected:", isNearConnected);
    }
  }, [isEvmConnected, isNearConnected, showDashboard]);

  const handleDashboardClick = () => {
    setShowDashboard(true);
  };

  const handleLoginPrompt = () => {
    if (!isEvmConnected) {
      open(); // This opens the modal for connecting to EVM wallet
    }
  };

  const landingPageProps: LandingPageProps = {
    isConnected: isEvmConnected, // Keep this as is for backward compatibility
    onDashboardClick: handleDashboardClick,
    onLoginPrompt: handleLoginPrompt,
  };

  return (
    <TooltipProvider>
      <Header />
      <Suspense fallback={<div>Loading...</div>}>
        {!showDashboard ? (
          <LandingPage {...landingPageProps} />
        ) : (
          <Dashboard
            isGitHubConnected={isGitHubConnected}
            setIsGitHubConnected={setIsGitHubConnected}
          />
        )}
      </Suspense>
    </TooltipProvider>
  );
};

export default Home;
