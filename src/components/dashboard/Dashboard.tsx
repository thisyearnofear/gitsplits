"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Command, FileCode, BarChart3, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardProps } from "@/types";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import XCommandsGuide from "./XCommandsGuide";
import DashboardOverview from "./DashboardOverview";
import { VerificationCenter } from "./features/verification";
import AgentActivity from "./AgentActivity";
import NearContractManager from "./NearContractManager";
import WalletStatusBar from "@/components/shared/WalletStatusBar";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

const TABS = [
  { value: "verification", label: "Verification", icon: Shield },
  { value: "commands", label: "X Commands", icon: Command },
  { value: "contract", label: "NEAR Contract", icon: FileCode },
  { value: "analytics", label: "Analytics", icon: LineChart },
  { value: "overview", label: "Overview", icon: BarChart3 },
];

const Dashboard: React.FC<DashboardProps> = ({
  isGitHubConnected,
  setIsGitHubConnected,
}) => {
  const [activeTab, setActiveTab] = useState("verification");
  const { address } = useAccount();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gentle-blue via-gentle-purple to-gentle-orange dark:from-gentle-blue-dark dark:via-gentle-purple-dark dark:to-gentle-orange-dark transition-colors duration-300">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your splits, verify contributors, and monitor activity.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => router.push("/splits")}
                className="bg-white/50 dark:bg-white/5 backdrop-blur-sm"
              >
                Open Splits
              </Button>
              <Button
                onClick={() => router.push("/agent")}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Try Agent
              </Button>
            </div>
          </div>
        </motion.div>

        <WalletStatusBar />
        
        {/* Main Dashboard Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <Card className="border-0 shadow-soft bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardContent className="p-2">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-2 bg-transparent">
                  {TABS.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <tab.icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </CardContent>
            </Card>

            {/* Tab Content */}
            <TabsContent value="verification" className="mt-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <VerificationCenter
                  isGitHubConnected={isGitHubConnected}
                  setIsGitHubConnected={setIsGitHubConnected}
                  walletAddress={address}
                />
              </motion.div>
            </TabsContent>

            <TabsContent value="commands" className="mt-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <XCommandsGuide />
                <div className="mt-4 text-center">
                  <a
                    href="/docs/x-commands.md"
                    className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Full X Command Reference
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="contract" className="mt-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <NearContractManager />
              </motion.div>
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <AnalyticsDashboard />
              </motion.div>
            </TabsContent>

            <TabsContent value="overview" className="mt-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <DashboardOverview />
                <AgentActivity />
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
