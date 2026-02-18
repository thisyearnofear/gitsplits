import React, { useEffect, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const WalletStatusBar: React.FC = () => {
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
  const [verificationStatus, setVerificationStatus] = useState<{
    loading: boolean;
    verified: boolean;
    githubUsername: string | null;
  }>({ loading: false, verified: false, githubUsername: null });
  const isAnyWalletConnected = isEvmConnected || isNearConnected;

  const supportedNetworkIds = ["1", "eip155:1", "42161", "eip155:42161"];
  const isWrongNetwork =
    isEvmConnected && !supportedNetworkIds.includes(selectedNetworkId ?? "");

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
    open();
  };

  const handleDisconnectNEAR = async () => {
    try {
      await disconnectNear();
    } catch (error) {
      console.error("Error disconnecting from NEAR wallet:", error);
    }
  };

  useEffect(() => {
    const q = nearAccountId || evmAddress;
    if (!q) {
      setVerificationStatus({ loading: false, verified: false, githubUsername: null });
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        setVerificationStatus((prev) => ({ ...prev, loading: true }));
        const response = await fetch(`/api/verification-mapping?q=${encodeURIComponent(q)}`);
        const data = await response.json();
        if (cancelled) return;
        const entry = Array.isArray(data?.entries) ? data.entries[0] : null;
        setVerificationStatus({
          loading: false,
          verified: Boolean(entry?.github_username),
          githubUsername: entry?.github_username ? String(entry.github_username) : null,
        });
      } catch {
        if (cancelled) return;
        setVerificationStatus({ loading: false, verified: false, githubUsername: null });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [nearAccountId, evmAddress]);

  return (
    <div className="flex justify-end items-center w-full mb-6" suppressHydrationWarning>
      {/* Wallet Selection Modal */}
      <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Your Wallet</DialogTitle>
            <DialogDescription>
              Choose a wallet to connect to GitSplits
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div
              className="cursor-pointer hover:shadow-md transition-shadow border rounded-lg p-4 flex flex-col items-center"
              onClick={handleEVMLogin}
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 784 784"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M392 784C608.5 784 784 608.5 784 392C784 175.5 608.5 0 392 0C175.5 0 0 175.5 0 392C0 608.5 175.5 784 392 784Z"
                    fill="#627EEA"
                  />
                  <path
                    d="M392 100V315L587 400L392 100Z"
                    fill="white"
                    fillOpacity="0.6"
                  />
                  <path d="M392 100L197 400L392 315V100Z" fill="white" />
                </svg>
              </div>
              <h3 className="font-medium">EVM Wallet</h3>
              <p className="text-sm text-gray-500 text-center mt-2">
                Connect with MetaMask, WalletConnect, or other EVM wallets
              </p>
            </div>
            <div
              className="cursor-pointer hover:shadow-md transition-shadow border rounded-lg p-4 flex flex-col items-center"
              onClick={handleNEARLogin}
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32Z"
                    fill="#000000"
                  />
                  <path
                    d="M21.2105 9.15789L18.1053 14.0211L17.6842 14.7368L13.8947 21.0526L10.7895 15.7895H8L13.8947 26.5263L21.2105 14.0211V22.1053H24V9.15789H21.2105Z"
                    fill="white"
                  />
                </svg>
              </div>
              <h3 className="font-medium">NEAR Wallet</h3>
              <p className="text-sm text-gray-500 text-center mt-2">
                Connect with Bitte Wallet for NEAR blockchain operations
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
                      ? `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}`
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
            <DropdownMenuItem className="flex justify-between">
              <span>Verification</span>
              {verificationStatus.loading ? (
                <span className="text-xs text-gray-500">Checking...</span>
              ) : verificationStatus.verified ? (
                <span className="text-green-600 text-xs">
                  Verified {verificationStatus.githubUsername ? `(@${verificationStatus.githubUsername})` : ""}
                </span>
              ) : (
                <span className="text-amber-600 text-xs">Not verified</span>
              )}
            </DropdownMenuItem>
            {!verificationStatus.loading && !verificationStatus.verified && (
              <DropdownMenuItem
                onClick={() => {
                  window.location.href = "/verify";
                }}
                className="text-blue-700"
              >
                Verify identity for payouts
              </DropdownMenuItem>
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
  );
};

export default WalletStatusBar;
