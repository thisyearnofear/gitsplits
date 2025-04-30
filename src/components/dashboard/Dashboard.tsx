import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardProps } from "@/types";
import XCommandsGuide from "./XCommandsGuide";
import DashboardOverview from "./DashboardOverview";
import VerificationCenter from "./VerificationCenter";
import MySplits from "./MySplits";
import MyEarnings from "./MyEarnings";
import AgentActivity from "./AgentActivity";
import Bounties from "./Bounties";
import SecurityLog from "./SecurityLog";
import NearContractManager from "./NearContractManager";

const Dashboard: React.FC<DashboardProps> = ({
  isGitHubConnected,
  setIsGitHubConnected,
}) => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gentle-blue via-gentle-purple to-gentle-orange">
      <div className="container mx-auto px-4 py-8">
        {/* Security Status Banner */}
        <Card className="mb-6 border-l-4 border-l-green-500">
          <CardContent className="flex items-center p-4">
            <div className="mr-4 bg-green-100 p-2 rounded-full">
              <Shield className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h3 className="font-medium">Secure Attribution Active</h3>
              <p className="text-sm text-gray-600">
                Your contributions are protected by our tiered verification
                system and TEE-secured agent
              </p>
            </div>
            <Button
              variant="outline"
              className="ml-auto"
              onClick={() => setActiveTab("verification")}
            >
              View Security Status
            </Button>
          </CardContent>
        </Card>

        {/* Verification Status */}
        {!isGitHubConnected && (
          <Card className="mb-6 border-l-4 border-l-amber-500">
            <CardContent className="flex items-center p-4">
              <div className="mr-4 bg-amber-100 p-2 rounded-full">
                <AlertCircle className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-medium">Verification Needed</h3>
                <p className="text-sm text-gray-600">
                  Link your GitHub identity to increase your verification level
                  and unlock more features
                </p>
              </div>
              <Button
                className="ml-auto"
                onClick={() => setActiveTab("verification")}
              >
                Verify Identity
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Dashboard Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
            <TabsTrigger value="splits">My Splits</TabsTrigger>
            <TabsTrigger value="earnings">My Earnings</TabsTrigger>
            <TabsTrigger value="bounties">Bounties</TabsTrigger>
            <TabsTrigger value="security">Security Log</TabsTrigger>
            <TabsTrigger value="commands">X Commands</TabsTrigger>
            <TabsTrigger value="contract">NEAR Contract</TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="overview">
            <DashboardOverview />
            <div className="mt-8">
              <AgentActivity />
            </div>
          </TabsContent>

          <TabsContent value="verification">
            <VerificationCenter
              isGitHubConnected={isGitHubConnected}
              setIsGitHubConnected={setIsGitHubConnected}
            />
          </TabsContent>

          <TabsContent value="splits">
            <MySplits />
          </TabsContent>

          <TabsContent value="earnings">
            <MyEarnings />
          </TabsContent>

          <TabsContent value="bounties">
            <Bounties />
          </TabsContent>

          <TabsContent value="security">
            <SecurityLog />
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
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
