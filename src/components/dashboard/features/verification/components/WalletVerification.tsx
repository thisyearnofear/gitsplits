"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Check } from "lucide-react";

interface WalletVerificationProps {
  type: "evm" | "near";
  isConnected: boolean;
  isVerified: boolean;
  address?: string | null;
  onVerify: () => void;
}

export const WalletVerification: React.FC<WalletVerificationProps> = ({
  type,
  isConnected,
  isVerified,
  address,
  onVerify,
}) => {
  const walletName = type === "evm" ? "EVM Wallet" : "NEAR Wallet";

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isVerified ? "bg-green-100" : "bg-gray-100"}`}>
              <Wallet className={`w-5 h-5 ${isVerified ? "text-green-600" : "text-gray-600"}`} />
            </div>
            <div>
              <p className="font-medium">{walletName}</p>
              {isConnected ? (
                <p className="text-sm text-green-600 truncate max-w-[200px]">
                  {address}
                </p>
              ) : (
                <p className="text-sm text-gray-600">Not connected</p>
              )}
            </div>
          </div>

          {isVerified ? (
            <Check className="w-5 h-5 text-green-500" />
          ) : isConnected ? (
            <Button size="sm" onClick={onVerify}>
              Verify
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled>
              Connect First
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
