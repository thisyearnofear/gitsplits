"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  GitBranch,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyActivity } from "@/components/empty-states/EmptyState";

// Mock data - replace with actual API calls
const MOCK_STATS = {
  totalDistributed: {
    value: 12550,
    currency: "NEAR",
    change: 23.5,
    changeType: "increase" as const,
    period: "vs last month",
  },
  totalContributors: {
    value: 148,
    change: 12,
    changeType: "increase" as const,
    period: "vs last month",
  },
  activeSplits: {
    value: 24,
    change: -2,
    changeType: "decrease" as const,
    period: "vs last month",
  },
  avgSplitSize: {
    value: 523,
    currency: "NEAR",
    change: 8.3,
    changeType: "increase" as const,
    period: "vs last month",
  },
};

const MOCK_CONTRIBUTOR_LEADERBOARD = [
  { rank: 1, name: "sarah-dev", contributions: 145, earned: 2450, avatar: "S", trend: "up" },
  { rank: 2, name: "alex-coder", contributions: 98, earned: 1890, avatar: "A", trend: "up" },
  { rank: 3, name: "mike-oss", contributions: 76, earned: 1420, avatar: "M", trend: "down" },
  { rank: 4, name: "jane-git", contributions: 54, earned: 980, avatar: "J", trend: "same" },
  { rank: 5, name: "tom-repo", contributions: 43, earned: 750, avatar: "T", trend: "up" },
];

const MOCK_PAYMENT_HISTORY = [
  { id: 1, repo: "facebook/react", amount: 500, contributors: 12, date: "2024-01-15", status: "completed" },
  { id: 2, repo: "vercel/next.js", amount: 350, contributors: 8, date: "2024-01-14", status: "completed" },
  { id: 3, repo: "microsoft/vscode", amount: 750, contributors: 15, date: "2024-01-12", status: "completed" },
  { id: 4, repo: "rust-lang/rust", amount: 280, contributors: 6, date: "2024-01-10", status: "completed" },
  { id: 5, repo: "nodejs/node", amount: 420, contributors: 10, date: "2024-01-08", status: "completed" },
];

const MOCK_MONTHLY_DATA = [
  { month: "Aug", distributed: 3200, contributors: 89 },
  { month: "Sep", distributed: 4100, contributors: 102 },
  { month: "Oct", distributed: 3800, contributors: 95 },
  { month: "Nov", distributed: 5200, contributors: 118 },
  { month: "Dec", distributed: 6100, contributors: 134 },
  { month: "Jan", distributed: 7550, contributors: 148 },
];

interface StatCardProps {
  title: string;
  value: string | number;
  currency?: string;
  change: number;
  changeType: "increase" | "decrease";
  period: string;
  icon: React.ElementType;
  color: string;
}

function StatCard({ title, value, currency, change, changeType, period, icon: Icon, color }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  };

  return (
    <Card className="border-0 shadow-soft bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm card-hover">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {currency && <span className="text-lg">{currency} </span>}
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {changeType === "increase" ? (
                <ArrowUpRight className="w-4 h-4 text-green-500" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm ${changeType === "increase" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {Math.abs(change)}%
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{period}</span>
            </div>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Simple bar chart component
function SimpleBarChart({ data }: { data: typeof MOCK_MONTHLY_DATA }) {
  const maxValue = Math.max(...data.map(d => d.distributed));
  
  return (
    <div className="h-64 flex items-end justify-between gap-2">
      {data.map((item, index) => (
        <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full flex flex-col gap-1">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(item.distributed / maxValue) * 100}%` }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg min-h-[4px]"
            />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">{item.month}</span>
        </div>
      ))}
    </div>
  );
}

// Simple pie chart for split distribution
function SimplePieChart() {
  const segments = [
    { label: "Top 10%", value: 45, color: "bg-blue-500" },
    { label: "Next 20%", value: 30, color: "bg-purple-500" },
    { label: "Next 30%", value: 15, color: "bg-green-500" },
    { label: "Remaining", value: 10, color: "bg-gray-300 dark:bg-gray-600" },
  ];

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="transform -rotate-90">
          {segments.reduce((acc, segment, index) => {
            const prevOffset = acc.offset;
            const dashArray = `${segment.value} ${100 - segment.value}`;
            
            acc.elements.push(
              <circle
                key={index}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                strokeWidth="20"
                strokeDasharray={dashArray}
                strokeDashoffset={-prevOffset}
                className={segment.color}
              />
            );
            
            acc.offset += segment.value;
            return acc;
          }, { elements: [] as React.ReactNode[], offset: 0 }).elements}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-900 dark:text-white">100%</span>
        </div>
      </div>
      <div className="space-y-2">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${segment.color}`} />
            <span className="text-sm text-gray-600 dark:text-gray-400">{segment.label}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{segment.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("6m");
  const hasData = MOCK_PAYMENT_HISTORY.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h2>
          <p className="text-gray-600 dark:text-gray-400">Track your splits, payments, and contributor activity.</p>
        </div>
        <div className="flex items-center gap-2">
          {["7d", "30d", "3m", "6m", "1y"].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
              className={timeRange === range ? "bg-gradient-to-r from-blue-600 to-purple-600" : ""}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Distributed"
          value={MOCK_STATS.totalDistributed.value}
          currency={MOCK_STATS.totalDistributed.currency}
          change={MOCK_STATS.totalDistributed.change}
          changeType={MOCK_STATS.totalDistributed.changeType}
          period={MOCK_STATS.totalDistributed.period}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Total Contributors"
          value={MOCK_STATS.totalContributors.value}
          change={MOCK_STATS.totalContributors.change}
          changeType={MOCK_STATS.totalContributors.changeType}
          period={MOCK_STATS.totalContributors.period}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Active Splits"
          value={MOCK_STATS.activeSplits.value}
          change={MOCK_STATS.activeSplits.change}
          changeType={MOCK_STATS.activeSplits.changeType}
          period={MOCK_STATS.activeSplits.period}
          icon={GitBranch}
          color="purple"
        />
        <StatCard
          title="Avg Split Size"
          value={MOCK_STATS.avgSplitSize.value}
          currency={MOCK_STATS.avgSplitSize.currency}
          change={MOCK_STATS.avgSplitSize.change}
          changeType={MOCK_STATS.avgSplitSize.changeType}
          period={MOCK_STATS.avgSplitSize.period}
          icon={BarChart3}
          color="orange"
        />
      </div>

      {/* Charts and Leaderboard */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="contributors" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Top Contributors
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Payment History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Distribution Chart */}
            <Card className="lg:col-span-2 border-0 shadow-soft bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Distribution Over Time</CardTitle>
                <CardDescription>Total value distributed per month</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleBarChart data={MOCK_MONTHLY_DATA} />
              </CardContent>
            </Card>

            {/* Split Distribution */}
            <Card className="border-0 shadow-soft bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Split Distribution</CardTitle>
                <CardDescription>How payments are distributed</CardDescription>
              </CardHeader>
              <CardContent>
                <SimplePieChart />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contributors">
          <Card className="border-0 shadow-soft bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Top Contributors</CardTitle>
              <CardDescription>Ranked by contributions and earnings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {MOCK_CONTRIBUTOR_LEADERBOARD.map((contributor, index) => (
                  <motion.div
                    key={contributor.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      contributor.rank === 1 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                      contributor.rank === 2 ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" :
                      contributor.rank === 3 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}>
                      {contributor.rank}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                      {contributor.avatar}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{contributor.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{contributor.contributions} contributions</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">{contributor.earned.toLocaleString()} NEAR</p>
                      <div className="flex items-center justify-end gap-1">
                        {contributor.trend === "up" && <TrendingUp className="w-3 h-3 text-green-500" />}
                        {contributor.trend === "down" && <TrendingDown className="w-3 h-3 text-red-500" />}
                        <span className={`text-xs ${
                          contributor.trend === "up" ? "text-green-600 dark:text-green-400" :
                          contributor.trend === "down" ? "text-red-600 dark:text-red-400" :
                          "text-gray-500"
                        }`}>
                          {contributor.trend === "up" ? "Rising" : contributor.trend === "down" ? "Falling" : "Stable"}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-0 shadow-soft bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Payment History</CardTitle>
              <CardDescription>Recent split distributions</CardDescription>
            </CardHeader>
            <CardContent>
              {hasData ? (
                <div className="space-y-3">
                  {MOCK_PAYMENT_HISTORY.map((payment, index) => (
                    <motion.div
                      key={payment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{payment.repo}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {payment.contributors} contributors • {payment.date}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">{payment.amount} NEAR</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          {payment.status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <EmptyActivity />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AnalyticsDashboard;
