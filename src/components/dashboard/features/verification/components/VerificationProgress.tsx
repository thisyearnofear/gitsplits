"use client";

import React from "react";
import { Shield } from "lucide-react";
import { VerificationLevel } from "../hooks/useVerification";

interface VerificationProgressProps {
  level: VerificationLevel;
}

const levelNames: Record<VerificationLevel, string> = {
  1: "Basic",
  2: "Identity Verified",
  3: "Fully Verified",
  4: "GitSplitter",
};

const levelDescriptions: Record<VerificationLevel, string> = {
  1: "Connect your EVM or NEAR wallet to continue.",
  2: "Verify both GitHub and X/Twitter for higher status.",
  3: "Verify both wallets for GitSplitter status.",
  4: "You are a GitSplitter! All identities verified.",
};

export const VerificationProgress: React.FC<VerificationProgressProps> = ({ level }) => {
  return (
    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
      <div className="bg-blue-100 p-4 rounded-full">
        <Shield className="h-12 w-12 text-blue-600" />
      </div>

      <div className="flex-1 w-full">
        <h3 className="text-lg font-medium mb-2">
          Level {level}: {levelNames[level]}
        </h3>

        <p className="text-gray-600 mb-4">{levelDescriptions[level]}</p>

        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${level * 25}%` }}
          />
        </div>
      </div>
    </div>
  );
};
