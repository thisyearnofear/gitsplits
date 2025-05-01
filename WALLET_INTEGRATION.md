# Wallet Integration in GitSplits

This document explains how the wallet integration works in GitSplits, including both EVM and NEAR wallets.

## Dual Wallet System

GitSplits supports two wallet systems:

1. **EVM Wallet (AppKit/Wagmi)** - For Ethereum, Arbitrum, and other EVM chains
2. **NEAR Wallet (Bitte)** - For NEAR blockchain operations

## EVM Wallet Configuration

The EVM wallet is configured in `src/context/index.tsx` using AppKit/Wagmi:

```tsx
// Create the modal
const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [mainnet, arbitrum, avalanche, base, optimism, polygon],
  defaultNetwork: mainnet,
  metadata: metadata,
  features: {
    analytics: true,
  },
});
```

## NEAR Wallet Integration

The NEAR wallet is integrated using Bitte Wallet:

```tsx
// src/components/near/BitteWalletProvider.tsx
<BitteWalletContextProvider
  network="testnet" // Use "mainnet" for production
>
  {children}
</BitteWalletContextProvider>
```

## User Authentication Flow

1. **Landing Page**:

   - Users can choose between EVM or NEAR wallet
   - Either wallet can grant access to the dashboard

2. **Dashboard**:
   - The NEAR Contract tab specifically uses the NEAR wallet
   - Other tabs use the EVM wallet

## Wallet Selection Modal

The wallet selection modal allows users to choose which wallet to connect:

```tsx
<Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Connect Your Wallet</DialogTitle>
    </DialogHeader>
    <div className="grid grid-cols-2 gap-4">
      <Card onClick={handleEVMLogin}>
        <CardContent>
          <h3>EVM Wallet</h3>
          <p>Connect with MetaMask, WalletConnect, etc.</p>
        </CardContent>
      </Card>
      <Card onClick={handleNEARLogin}>
        <CardContent>
          <h3>NEAR Wallet</h3>
          <p>Connect with Bitte Wallet</p>
        </CardContent>
      </Card>
    </div>
  </DialogContent>
</Dialog>
```
