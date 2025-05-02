"use client";
import Dashboard from "@/components/dashboard/Dashboard";
import { useState } from "react";

export default function DashboardPage() {
  const [isGitHubConnected, setIsGitHubConnected] = useState(false);
  return (
    <Dashboard
      isGitHubConnected={isGitHubConnected}
      setIsGitHubConnected={setIsGitHubConnected}
    />
  );
}
