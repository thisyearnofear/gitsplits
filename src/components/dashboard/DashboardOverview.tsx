"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Shield,
  DollarSign,
  Twitter,
  GitBranch,
  Github,
  UserCheck,
  ArrowRight,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { motion } from "framer-motion";

// Stats data
const STATS = [
  { label: "Total Splits", value: "12", change: "+3 this month", icon: GitBranch, color: "blue" },
  { label: "Contributors Paid", value: "48", change: "+12 this month", icon: Users, color: "purple" },
  { label: "Total Distributed", value: "2,450 NEAR", change: "+850 this month", icon: DollarSign, color: "green" },
  { label: "Verified Wallets", value: "32", change: "+8 this month", icon: Wallet, color: "orange" },
];

// Recent activity data
const RECENT_ACTIVITY = [
  {
    icon: GitBranch,
    iconColor: "blue",
    title: "Split created for near/near-sdk-rs",
    time: "2 hours ago",
    description: "15 contributors will receive payments",
  },
  {
    icon: DollarSign,
    iconColor: "green",
    title: "100 NEAR distributed to 15 contributors",
    time: "4 hours ago",
    description: "Transaction confirmed on NEAR",
  },
  {
    icon: UserCheck,
    iconColor: "purple",
    title: "johndoe verified GitHub identity",
    time: "1 day ago",
    description: "Wallet verification completed",
  },
  {
    icon: Github,
    iconColor: "gray",
    title: "New repository connected",
    time: "2 days ago",
    description: "facebook/react added to splits",
  },
];

// Value props
const VALUE_PROPS = [
  {
    icon: Shield,
    title: "Secure Attribution",
    description: "Your contributions are securely verified and recorded on-chain for transparent attribution",
    color: "blue",
  },
  {
    icon: DollarSign,
    title: "Fair Compensation",
    description: "Receive your fair share based on quality-weighted contribution analysis",
    color: "purple",
  },
  {
    icon: Twitter,
    title: "Simple Interaction",
    description: "Manage splits with agent commands or the web dashboard",
    color: "green",
  },
];

const DashboardOverview: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="border-0 shadow-soft bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm card-hover">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {stat.change}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    stat.color === "blue" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" :
                    stat.color === "purple" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" :
                    stat.color === "green" ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" :
                    "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                  }`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Value Proposition Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {VALUE_PROPS.map((prop, index) => (
          <motion.div
            key={prop.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
          >
            <Card className="h-full border-0 shadow-soft bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm card-hover">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                  prop.color === "blue" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" :
                  prop.color === "purple" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" :
                  "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                }`}>
                  <prop.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{prop.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{prop.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.7 }}
      >
        <Card className="border-0 shadow-soft bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-gray-900 dark:text-white">Recent Activity</CardTitle>
              <CardDescription>Latest actions across your splits</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {RECENT_ACTIVITY.map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.8 + index * 0.1 }}
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    activity.iconColor === "blue" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" :
                    activity.iconColor === "green" ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" :
                    activity.iconColor === "purple" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" :
                    "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  }`}>
                    <activity.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">{activity.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{activity.description}</p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{activity.time}</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default DashboardOverview;
