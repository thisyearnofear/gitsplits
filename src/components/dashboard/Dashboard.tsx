import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, AlertCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardProps } from "@/types";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import XCommandsGuide from "./XCommandsGuide";
import DashboardOverview from "./DashboardOverview";
import VerificationCenter from "./VerificationCenter";
import AgentActivity from "./AgentActivity";
import NearContractManager from "./NearContractManager";
import WalletStatusBar from "@/components/shared/WalletStatusBar";

const Dashboard: React.FC<DashboardProps> = ({
  isGitHubConnected,
  setIsGitHubConnected,
}) => {
  const [activeTab, setActiveTab] = useState("verification");
  const { address } = useAccount();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gentle-blue via-gentle-purple to-gentle-orange">
      <div className="container mx-auto px-4 py-8">
        <WalletStatusBar />
        <div className="mb-4 flex justify-end">
          <Button variant="outline" onClick={() => router.push("/splits")}>
            Open Splits
          </Button>
        </div>
        {/* Main Dashboard Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="verification">Verification</TabsTrigger>
            <TabsTrigger value="commands">X Commands</TabsTrigger>
            <TabsTrigger value="contract">NEAR Contract</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="verification">
            <VerificationCenter
              isGitHubConnected={isGitHubConnected}
              setIsGitHubConnected={setIsGitHubConnected}
              walletAddress={address}
            />
          </TabsContent>

          <TabsContent value="commands">
            <XCommandsGuide />
            <div className="mt-4 text-center">
              <a
                href="/docs/x-commands.md"
                className="text-blue-600 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Full X Command Reference
              </a>
            </div>
          </TabsContent>

          <TabsContent value="contract">
            <NearContractManager />
          </TabsContent>

          <TabsContent value="overview">
            <DashboardOverview />
            <div className="mt-8">
              <AgentActivity />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
