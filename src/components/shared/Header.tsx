"use client";

import React, { useState, useEffect } from "react";
import {
  useAppKit,
  useAppKitAccount,
  useAppKitState,
} from "@reown/appkit/react";
import { useNearWallet } from "@/hooks/useNearWallet";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut, ChevronDown, Menu, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WalletSelector } from "./WalletSelector";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { label: "Agent", href: "/agent" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Splits", href: "/splits" },
];

const Header: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { open } = useAppKit();
  const { isConnected: isEvmConnected, address: evmAddress } =
    useAppKitAccount();
  const { selectedNetworkId } = useAppKitState();
  const {
    isConnected: isNearConnected,
    accountId: nearAccountId,
    connect: connectNear,
    disconnect: disconnectNear,
  } = useNearWallet();

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Combined connection status
  const isAnyWalletConnected = isEvmConnected || isNearConnected;

  // Track scroll position for header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    open();
  };

  const handleDisconnectNEAR = async () => {
    try {
      await disconnectNear();
    } catch (error) {
      console.error("Error disconnecting from NEAR wallet:", error);
    }
  };

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <WalletSelector
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSelectEVM={handleEVMLogin}
        onSelectNEAR={handleNEARLogin}
      />
      
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-soft"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <motion.div
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => router.push("/")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-10 h-10 rounded-xl bg-black dark:bg-white flex items-center justify-center">
                <span className="text-white dark:text-black font-black text-lg italic tracking-tighter">GS</span>
              </div>
              <h1 className="text-2xl font-black gradient-text hidden sm:block tracking-tight">
                GITSPLITS
              </h1>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {NAV_ITEMS.map((item) => (
                <Button
                  key={item.href}
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(item.href)}
                  className={`relative uppercase tracking-widest text-[11px] font-black h-9 px-4 ${
                    isActive(item.href) ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  {item.label}
                  {isActive(item.href) && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </Button>
              ))}
            </nav>

            {/* Right side actions */}
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              
              {/* Desktop Wallet Button */}
              <div className="hidden sm:block">
                {!isAnyWalletConnected ? (
                  <Button
                    onClick={handleConnectWallet}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Wallet className="h-4 w-4" />
                    Connect
                  </Button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
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
                            <span className="hidden lg:inline">
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
                            <span className="hidden lg:inline">{nearAccountId}</span>
                          </div>
                        )}
                        <ChevronDown className="h-4 w-4" />
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
                          <DropdownMenuItem className="text-xs text-muted-foreground">
                            {getNetworkName()}: {evmAddress
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
                          <DropdownMenuItem className="text-xs text-muted-foreground">
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
                          className="text-destructive"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Disconnect EVM
                        </DropdownMenuItem>
                      )}

                      {isNearConnected && (
                        <DropdownMenuItem
                          onClick={handleDisconnectNEAR}
                          className="text-destructive"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Disconnect NEAR
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl"
            >
              <div className="container mx-auto px-4 py-4 space-y-2">
                {NAV_ITEMS.map((item) => (
                  <Button
                    key={item.href}
                    variant={isActive(item.href) ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      router.push(item.href);
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
                
                {/* Mobile Wallet Button */}
                <div className="pt-2 border-t border-border/50">
                  {!isAnyWalletConnected ? (
                    <Button
                      onClick={() => {
                        handleConnectWallet();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full"
                    >
                      <Wallet className="h-4 w-4 mr-2" />
                      Connect Wallet
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      {isEvmConnected && (
                        <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg">
                          <span className="text-sm">EVM</span>
                          <span className="text-xs text-muted-foreground">
                            {evmAddress?.slice(0, 6)}...{evmAddress?.slice(-4)}
                          </span>
                        </div>
                      )}
                      {isNearConnected && (
                        <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg">
                          <span className="text-sm">NEAR</span>
                          <span className="text-xs text-muted-foreground">{nearAccountId}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Spacer for fixed header */}
      <div className="h-16" />
    </>
  );
};

export default Header;
