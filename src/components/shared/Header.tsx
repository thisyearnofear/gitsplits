import React, { useState, useEffect } from "react";
import {
  useAppKit,
  useAppKitAccount,
  useAppKitState,
} from "@reown/appkit/react";
import { useNearWallet } from "@/hooks/useNearWallet";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WalletSelector } from "./WalletSelector";
import { useRouter } from "next/navigation";

const Header: React.FC = () => {
  const router = useRouter();
  const { open } = useAppKit();
  const { isConnected: isEvmConnected, address: evmAddress } =
    useAppKitAccount();
  const { selectedNetworkId } = useAppKitState();
  const {
    isConnected: isNearConnected,
    accountId: nearAccountId,
    connect: connectNear,
    disconnect: disconnectNear,
    isLoading: isNearLoading,
  } = useNearWallet();

  const [showWalletModal, setShowWalletModal] = useState(false);

  // Combined connection status
  const isAnyWalletConnected = isEvmConnected || isNearConnected;

  // Track wallet connection status
  useEffect(() => {
    // This effect is used to track changes in wallet connection status
  }, [isEvmConnected, isNearConnected, nearAccountId, isAnyWalletConnected]);

  // Supported networks: Ethereum Mainnet and Arbitrum
  const supportedNetworkIds = [
    "1",
    "eip155:1", // Ethereum Mainnet
    "42161",
    "eip155:42161", // Arbitrum
  ];
  const isWrongNetwork =
    isEvmConnected && !supportedNetworkIds.includes(selectedNetworkId ?? "");

  // Get network name for display
  const getNetworkName = () => {
    if (!selectedNetworkId) return "Unknown";
    if (selectedNetworkId.includes("1")) return "Ethereum";
    if (selectedNetworkId.includes("42161")) return "Arbitrum";
    return "Unsupported Network";
  };

  const handleConnectWallet = () => {
    setShowWalletModal(true);
  };

  const handleEVMLogin = () => {
    setShowWalletModal(false);
    open();
  };

  const handleNEARLogin = async () => {
    setShowWalletModal(false);
    try {
      await connectNear();
    } catch (error) {
      console.error("Error connecting to NEAR wallet:", error);
    }
  };

  const handleDisconnectEVM = () => {
    // AppKit doesn't have a direct disconnect method
    // Usually handled through the modal
    open();
  };

  const handleDisconnectNEAR = async () => {
    try {
      await disconnectNear();
    } catch (error) {
      console.error("Error disconnecting from NEAR wallet:", error);
    }
  };

  return (
    <>
      <WalletSelector
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSelectEVM={handleEVMLogin}
        onSelectNEAR={handleNEARLogin}
      />
      <div className="flex justify-between items-center w-full px-6 py-4 bg-white/80 backdrop-blur-sm fixed top-0 z-50">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            GitSplits
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard")}>
            Dashboard
          </Button>
          <Button variant="ghost" onClick={() => router.push("/verify")}>
            Verify
          </Button>
          <Button variant="ghost" onClick={() => router.push("/splits")}>
            Splits
          </Button>
          {!isAnyWalletConnected ? (
            <Button
              onClick={handleConnectWallet}
              className="flex items-center gap-2"
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  {isEvmConnected && (
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 784 784"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M392 784C608.5 784 784 608.5 784 392C784 175.5 608.5 0 392 0C175.5 0 0 175.5 0 392C0 608.5 175.5 784 392 784Z"
                            fill="#627EEA"
                          />
                        </svg>
                      </div>
                      <span>
                        {evmAddress
                          ? `${evmAddress.slice(0, 6)}...${evmAddress.slice(
                              -4
                            )}`
                          : ""}
                      </span>
                    </div>
                  )}
                  {isNearConnected && (
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center mr-2">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 32 32"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M21.2105 9.15789L18.1053 14.0211L17.6842 14.7368L13.8947 21.0526L10.7895 15.7895H8L13.8947 26.5263L21.2105 14.0211V22.1053H24V9.15789H21.2105Z"
                            fill="white"
                          />
                        </svg>
                      </div>
                      <span>{nearAccountId}</span>
                    </div>
                  )}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Wallet Status</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {isEvmConnected && (
                  <>
                    <DropdownMenuItem className="flex justify-between">
                      <span>EVM Wallet</span>
                      <span className="text-green-600 text-xs">Connected</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-xs text-gray-500">
                      {getNetworkName()}:{" "}
                      {evmAddress
                        ? `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}`
                        : ""}
                    </DropdownMenuItem>
                  </>
                )}

                {isNearConnected && (
                  <>
                    <DropdownMenuItem className="flex justify-between">
                      <span>NEAR Wallet</span>
                      <span className="text-green-600 text-xs">Connected</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-xs text-gray-500">
                      {nearAccountId}
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />

                {!isEvmConnected && (
                  <DropdownMenuItem onClick={handleEVMLogin}>
                    Connect EVM Wallet
                  </DropdownMenuItem>
                )}

                {!isNearConnected && (
                  <DropdownMenuItem onClick={handleNEARLogin}>
                    Connect NEAR Wallet
                  </DropdownMenuItem>
                )}

                {isEvmConnected && (
                  <DropdownMenuItem
                    onClick={handleDisconnectEVM}
                    className="text-red-600"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Disconnect EVM
                  </DropdownMenuItem>
                )}

                {isNearConnected && (
                  <DropdownMenuItem
                    onClick={handleDisconnectNEAR}
                    className="text-red-600"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Disconnect NEAR
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      {/* Spacer div to prevent content from being hidden under the fixed header */}
      <div className="h-16" /> {/* Adjust height to match header height */}
    </>
  );
};

export default Header;
