"use client";

import React from 'react';
import "@near-wallet-selector/modal-ui/styles.css";
import { BitteWalletContextProvider } from '@bitte-ai/react';

interface BitteWalletProviderProps {
  children: React.ReactNode;
}

const BitteWalletProvider: React.FC<BitteWalletProviderProps> = ({ children }) => {
  return (
    <BitteWalletContextProvider
      network="testnet" // Use "mainnet" for production
    >
      {children}
    </BitteWalletContextProvider>
  );
};

export default BitteWalletProvider;
