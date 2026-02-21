/**
 * TEE Wallet Tool
 *
 * Provides access to the TEE-generated wallet when running on EigenCompute.
 * EigenCompute automatically injects a MNEMONIC environment variable at runtime
 * that is unique to the app's enclave.
 */

import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import type { HDAccount, PrivateKeyAccount } from 'viem/accounts';

let wallet: HDAccount | PrivateKeyAccount | null = null;
let isTeeMnemonic = false;
let isMock = false;

const MOCK_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

function getWallet(): HDAccount | PrivateKeyAccount | null {
  if (wallet || isMock) return wallet;

  const mnemonic = process.env.MNEMONIC;

  if (mnemonic) {
    console.log('[TEE-Wallet] Deriving wallet from TEE mnemonic');
    wallet = mnemonicToAccount(mnemonic);
    isTeeMnemonic = true;
  } else {
    console.log('[TEE-Wallet] No MNEMONIC env var found — not running in TEE, using mock mode');
    isMock = true;
  }

  return wallet;
}

export const teeWalletTool = {
  name: 'tee-wallet' as const,

  /**
   * Get wallet info including address and mode indicators
   */
  getWalletInfo() {
    const w = getWallet();

    return {
      address: w ? w.address : MOCK_ADDRESS,
      isTeeMnemonic,
      isMock,
    };
  },

  /**
   * Sign a message with the TEE wallet
   */
  async signMessage(message: string) {
    const w = getWallet();

    if (!w) {
      console.log('[TEE-Wallet] Mock mode — returning mock signature');
      return {
        signature: '0x' + '00'.repeat(65),
        address: MOCK_ADDRESS,
      };
    }

    const signature = await w.signMessage({ message });
    return {
      signature,
      address: w.address,
    };
  },

  /**
   * Get the wallet address
   */
  getAddress(): string {
    const w = getWallet();
    return w ? w.address : MOCK_ADDRESS;
  },

  /**
   * Check if running inside an EigenCompute TEE (MNEMONIC env var is set)
   */
  isRunningInTEE(): boolean {
    return !!process.env.MNEMONIC;
  },
};
