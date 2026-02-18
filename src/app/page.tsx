"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useAppKitAccount, useAppKit } from "@reown/appkit/react";
import { useRouter } from "next/navigation";
import Header from "@/components/shared/Header";
import { LandingPageProps } from "@/types";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

const LandingPage = dynamic(() => import("@/components/landing/LandingPage"), {
  ssr: false,
});

const Home = () => {
  const { isConnected: isEvmConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const router = useRouter();

  const handleLoginPrompt = () => {
    if (!isEvmConnected) {
      open(); // This opens the modal for connecting to EVM wallet
    }
  };

  const landingPageProps: LandingPageProps = {
    isConnected: isEvmConnected,
    onDashboardClick: () => {
      router.push("/dashboard");
    },
    onLoginPrompt: handleLoginPrompt,
  };

  return (
    <TooltipProvider>
      <Header />
      <OnboardingFlow />
      <Suspense fallback={<div>Loading...</div>}>
        <LandingPage {...landingPageProps} />
      </Suspense>
    </TooltipProvider>
  );
};

export default Home;
