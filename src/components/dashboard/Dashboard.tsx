import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, AlertCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardProps } from "@/types";
import XCommandsGuide from "./XCommandsGuide";
import DashboardOverview from "./DashboardOverview";
import VerificationCenter from "./VerificationCenter";
import AgentActivity from "./AgentActivity";
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="commands">X Commands</TabsTrigger>
            <TabsTrigger value="contract">NEAR Contract</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
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

          {/* Coming Soon Section */}
          <div className="mt-8 p-6 bg-white/80 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Lock className="mr-2 h-5 w-5 text-blue-500" />
              Coming Soon
            </h3>
            <p className="text-gray-600 mb-4">
              We're actively developing additional features to enhance your
              GitSplits experience:
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">My Splits</h4>
                  <p className="text-sm text-gray-500">
                    Manage your repository splits and contributor allocations
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">My Earnings</h4>
                  <p className="text-sm text-gray-500">
                    Track your earnings from contributions across repositories
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Security Log</h4>
                  <p className="text-sm text-gray-500">
                    View detailed security events and verification activities
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
