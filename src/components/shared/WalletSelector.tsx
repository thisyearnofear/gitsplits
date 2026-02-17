import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface WalletSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEVM: () => void;
  onSelectNEAR: () => void;
}

const WalletOption: React.FC<{
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ onClick, icon, title, description }) => (
  <Card
    className="cursor-pointer hover:shadow-md transition-shadow border rounded-lg"
    onClick={onClick}
  >
    <CardContent className="flex flex-col items-center justify-center p-6">
      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-gray-500 text-center mt-2">{description}</p>
    </CardContent>
  </Card>
);

export const WalletSelector: React.FC<WalletSelectorProps> = ({
  isOpen,
  onClose,
  onSelectEVM,
  onSelectNEAR,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Your Wallet</DialogTitle>
          <DialogDescription>
            Choose a wallet to connect to GitSplits
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <WalletOption
            onClick={onSelectEVM}
            icon={
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
            }
            title="EVM Wallet"
            description="Connect with MetaMask, WalletConnect, or other EVM wallets"
          />

          <WalletOption
            onClick={onSelectNEAR}
            icon={
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
            }
            title="NEAR Wallet"
            description="Connect with Bitte Wallet for NEAR blockchain operations"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletSelector;
