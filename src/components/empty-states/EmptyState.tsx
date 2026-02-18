"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  illustration?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  illustration,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      {illustration || (
        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mb-6">
          <Icon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
      )}

      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>

      <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
        {description}
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        {action && (
          <Button
            onClick={action.onClick}
            variant={action.variant || "default"}
            className={
              action.variant === "default" || !action.variant
                ? "bg-gradient-to-r from-blue-600 to-purple-600"
                : ""
            }
          >
            {action.label}
          </Button>
        )}

        {secondaryAction && (
          <Button variant="ghost" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// Pre-built empty states for common scenarios
export function EmptySplits({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={require("lucide-react").GitBranch}
      title="No splits yet"
      description="Create your first split to start distributing payments to contributors. It's easy and only takes a minute."
      action={{
        label: "Create Split",
        onClick: onCreate,
      }}
      secondaryAction={{
        label: "Learn more",
        onClick: () => window.open("/docs/splits", "_blank"),
      }}
    />
  );
}

export function EmptyContributors({ onInvite }: { onInvite: () => void }) {
  return (
    <EmptyState
      icon={require("lucide-react").Users}
      title="No contributors found"
      description="This repository doesn't have any contributors yet, or they haven't verified their wallets."
      action={{
        label: "Invite Contributors",
        onClick: onInvite,
      }}
    />
  );
}

export function EmptyActivity() {
  return (
    <EmptyState
      icon={require("lucide-react").Activity}
      title="No activity yet"
      description="Activity will appear here once you start creating splits and making payments."
    />
  );
}

export function EmptyWallet({ onConnect }: { onConnect: () => void }) {
  return (
    <EmptyState
      icon={require("lucide-react").Wallet}
      title="Connect your wallet"
      description="Connect a wallet to start creating splits, verifying contributors, and distributing payments."
      action={{
        label: "Connect Wallet",
        onClick: onConnect,
      }}
    />
  );
}

export function EmptySearch({ onClear }: { onClear: () => void }) {
  return (
    <EmptyState
      icon={require("lucide-react").Search}
      title="No results found"
      description="We couldn't find anything matching your search. Try different keywords or filters."
      action={{
        label: "Clear Search",
        onClick: onClear,
        variant: "outline",
      }}
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon={require("lucide-react").Bell}
      title="No notifications"
      description="You're all caught up! Notifications will appear here when there's activity on your splits."
    />
  );
}

export function EmptyVerification({ onStart }: { onStart: () => void }) {
  return (
    <EmptyState
      icon={require("lucide-react").Shield}
      title="Start verification"
      description="Verify your GitHub identity and link your wallet to receive payments from splits."
      action={{
        label: "Start Verification",
        onClick: onStart,
      }}
    />
  );
}

export function EmptyRepos({ onAnalyze }: { onAnalyze: () => void }) {
  return (
    <EmptyState
      icon={require("lucide-react").Github}
      title="No repositories analyzed"
      description="Analyze a GitHub repository to see contributor breakdowns and create splits."
      action={{
        label: "Analyze Repository",
        onClick: onAnalyze,
      }}
    />
  );
}

export default EmptyState;
