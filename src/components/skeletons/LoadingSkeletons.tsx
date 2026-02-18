"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/utils/pure/cn";

// Base shimmer effect
function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent",
        className
      )}
    />
  );
}

// Skeleton base component
function SkeletonBase({
  className,
  width,
  height,
}: {
  className?: string;
  width?: string;
  height?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-gray-200 dark:bg-gray-800",
        className
      )}
      style={{ width, height }}
    >
      <Shimmer className="absolute inset-0" />
    </div>
  );
}

// Card Skeleton
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="space-y-2">
        <SkeletonBase width="60%" height="24px" />
        <SkeletonBase width="40%" height="16px" />
      </CardHeader>
      <CardContent className="space-y-4">
        <SkeletonBase width="100%" height="60px" />
        <div className="flex gap-2">
          <SkeletonBase width="80px" height="32px" />
          <SkeletonBase width="80px" height="32px" />
        </div>
      </CardContent>
    </Card>
  );
}

// Stats Card Skeleton
export function StatsCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <SkeletonBase width="120px" height="16px" />
            <SkeletonBase width="80px" height="32px" />
            <SkeletonBase width="100px" height="16px" />
          </div>
          <SkeletonBase width="48px" height="48px" className="rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

// List Item Skeleton
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
      <SkeletonBase width="40px" height="40px" className="rounded-full" />
      <div className="flex-1 space-y-2">
        <SkeletonBase width="60%" height="16px" />
        <SkeletonBase width="40%" height="12px" />
      </div>
      <SkeletonBase width="80px" height="24px" />
    </div>
  );
}

// Table Row Skeleton
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 py-3 px-4">
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonBase
          key={i}
          width={i === 0 ? "40%" : "20%"}
          height="16px"
          className="flex-1"
        />
      ))}
    </div>
  );
}

// Chart Skeleton
export function ChartSkeleton({ bars = 6 }: { bars?: number }) {
  return (
    <div className="h-64 flex items-end justify-between gap-2">
      {Array.from({ length: bars }).map((_, i) => (
        <SkeletonBase
          key={i}
          width="100%"
          height={`${Math.random() * 60 + 20}%`}
          className="rounded-t-lg"
        />
      ))}
    </div>
  );
}

// Repository Analysis Skeleton
export function RepoAnalysisSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <SkeletonBase width="48px" height="48px" className="rounded-xl" />
            <div className="space-y-2">
              <SkeletonBase width="200px" height="20px" />
              <SkeletonBase width="150px" height="14px" />
            </div>
          </div>
          <SkeletonBase width="100px" height="32px" />
        </div>
        <div className="space-y-2">
          <SkeletonBase width="100%" height="60px" />
          <div className="flex -space-x-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBase
                key={i}
                width="32px"
                height="32px"
                className="rounded-full border-2 border-white dark:border-gray-800"
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Contributor Card Skeleton
export function ContributorCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
      <SkeletonBase width="32px" height="32px" className="rounded-full" />
      <SkeletonBase width="40px" height="40px" className="rounded-full" />
      <div className="flex-1 space-y-2">
        <SkeletonBase width="120px" height="16px" />
        <SkeletonBase width="80px" height="12px" />
      </div>
      <div className="text-right space-y-1">
        <SkeletonBase width="80px" height="16px" />
        <SkeletonBase width="60px" height="12px" />
      </div>
    </div>
  );
}

// Dashboard Skeleton (Full page)
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <SkeletonBase width="200px" height="32px" />
        <SkeletonBase width="300px" height="16px" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Tabs */}
      <SkeletonBase width="100%" height="48px" className="rounded-lg" />

      {/* Content */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <ListItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// Landing Page Skeleton
export function LandingPageSkeleton() {
  return (
    <div className="container mx-auto px-4 pt-24 pb-16 space-y-12">
      {/* Hero */}
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <SkeletonBase width="200px" height="32px" className="mx-auto rounded-full" />
        <SkeletonBase width="80%" height="48px" className="mx-auto" />
        <SkeletonBase width="60%" height="24px" className="mx-auto" />
        <div className="flex justify-center gap-3">
          <SkeletonBase width="140px" height="48px" className="rounded-full" />
          <SkeletonBase width="140px" height="48px" className="rounded-full" />
        </div>
      </div>

      {/* Analysis Card */}
      <CardSkeleton />

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// Splits List Skeleton
export function SplitsListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SkeletonBase width="40px" height="40px" className="rounded-lg" />
                  <div className="space-y-2">
                    <SkeletonBase width="150px" height="16px" />
                    <SkeletonBase width="100px" height="12px" />
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <SkeletonBase width="80px" height="16px" />
                  <SkeletonBase width="60px" height="12px" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// Activity Feed Skeleton
export function ActivityFeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <SkeletonBase width="150px" height="20px" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <SkeletonBase width="32px" height="32px" className="rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonBase width="70%" height="14px" />
              <SkeletonBase width="40%" height="12px" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Wallet Connection Skeleton
export function WalletConnectionSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <SkeletonBase width="48px" height="48px" className="rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonBase width="60%" height="18px" />
            <SkeletonBase width="40%" height="14px" />
          </div>
          <SkeletonBase width="100px" height="36px" className="rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

// Staggered container for skeletons
export function SkeletonContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("animate-pulse", className)}>
      {children}
    </div>
  );
}

export default {
  Card: CardSkeleton,
  StatsCard: StatsCardSkeleton,
  ListItem: ListItemSkeleton,
  TableRow: TableRowSkeleton,
  Chart: ChartSkeleton,
  RepoAnalysis: RepoAnalysisSkeleton,
  ContributorCard: ContributorCardSkeleton,
  Dashboard: DashboardSkeleton,
  LandingPage: LandingPageSkeleton,
  SplitsList: SplitsListSkeleton,
  ActivityFeed: ActivityFeedSkeleton,
  WalletConnection: WalletConnectionSkeleton,
  Container: SkeletonContainer,
};
