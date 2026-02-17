"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Shield, Wallet, Check, Github, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerificationLevel } from "./types";

interface VerificationStatusCardProps {
  level: VerificationLevel;
  isEvmConnected: boolean;
  isNearConnected: boolean;
  isEvmVerified: boolean;
  isNearVerified: boolean;
  isGithubVerified: boolean;
  isTwitterVerified: boolean;
  evmAddress?: string;
  nearAccountId?: string | null;
  onEvmVerify: () => void;
  onNearVerify: () => void;
}

const levelNames: Record<VerificationLevel, string> = {
  1: "Basic",
  2: "Identity Verified",
  3: "Fully Verified",
  4: "GitSplitter",
};

const levelDescriptions: Record<VerificationLevel, string> = {
  1: "You have basic verification. Connect your EVM or NEAR wallet to continue.",
  2: "One of your identities and one wallet is verified. Verify both GitHub and X/Twitter, and both wallets for the highest level.",
  3: "You have both GitHub and X/Twitter verified, and at least one wallet. Verify both wallets for GitSplitter status.",
  4: "You are a GitSplitter! All identities and wallets are verified.",
};

export const VerificationStatusCard: React.FC<VerificationStatusCardProps> = ({
  level,
  isEvmConnected,
  isNearConnected,
  isEvmVerified,
  isNearVerified,
  isGithubVerified,
  isTwitterVerified,
  evmAddress,
  nearAccountId,
  onEvmVerify,
  onNearVerify,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Verification Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-medium mb-2">
              Level {level}: {levelNames[level]}
            </h3>

            <p className="text-gray-600 mb-4">{levelDescriptions[level]}</p>

            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${level * 25}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* EVM Wallet */}
              <div className="border rounded-md p-4">
                <div className="flex items-center mb-2">
                  <Wallet className="mr-2 h-5 w-5" />
                  <h4 className="font-medium">EVM Wallet</h4>
                  {isEvmVerified && <Check className="ml-2 h-4 w-4 text-green-500" />}
                </div>
                {isEvmConnected ? (
                  <>
                    <p className="text-sm text-green-600 mb-2 truncate">
                      Connected: {evmAddress}
                    </p>
                    {!isEvmVerified && (
                      <Button size="sm" onClick={onEvmVerify}>
                        Verify EVM
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-600">Not connected</p>
                )}
              </div>

              {/* NEAR Wallet */}
              <div className="border rounded-md p-4">
                <div className="flex items-center mb-2">
                  <Wallet className="mr-2 h-5 w-5" />
                  <h4 className="font-medium">NEAR Wallet</h4>
                  {isNearVerified && <Check className="ml-2 h-4 w-4 text-green-500" />}
                </div>
                {isNearConnected ? (
                  <>
                    <p className="text-sm text-green-600 mb-2 truncate">
                      Connected: {nearAccountId}
                    </p>
                    {!isNearVerified && (
                      <Button size="sm" onClick={onNearVerify}>
                        Verify NEAR
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-600">Not connected</p>
                )}
              </div>

              {/* GitHub */}
              <div className="border rounded-md p-4">
                <div className="flex items-center mb-2">
                  <Github className="mr-2 h-5 w-5" />
                  <h4 className="font-medium">GitHub</h4>
                  {isGithubVerified && <Check className="ml-2 h-4 w-4 text-green-500" />}
                </div>
                <p className="text-sm text-gray-600">
                  {isGithubVerified ? "Verified" : "Not verified"}
                </p>
              </div>

              {/* Twitter */}
              <div className="border rounded-md p-4">
                <div className="flex items-center mb-2">
                  <Twitter className="mr-2 h-5 w-5" />
                  <h4 className="font-medium">X/Twitter</h4>
                  {isTwitterVerified && <Check className="ml-2 h-4 w-4 text-green-500" />}
                </div>
                <p className="text-sm text-gray-600">
                  {isTwitterVerified ? "Verified" : "Not verified"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
