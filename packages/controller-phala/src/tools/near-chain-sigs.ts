/**
 * NEAR Chain Signatures Tool
 *
 * Abstraction for requesting multi-party computation (MPC) signatures
 * from the NEAR network. This allows the Sovereign Controller (Phala)
 * to execute transactions on EVM chains (Ethereum, Base, Arbitrum)
 * natively.
 */

import { Account } from 'near-api-js';
import { keccak256 } from 'viem';
import BN from 'bn.js';

export interface ChainSignatureRequest {
  path: string;
  payload: Uint8Array | string;
  keyVersion?: number;
}

export interface ChainSignatureResult {
  signature: string;
  recoveryId: number;
}

export class NearChainSignatures {
  private account: Account;
  private mpcContractId: string;

  constructor(account: Account, mpcContractId: string = 'v1.signer') {
    this.account = account;
    this.mpcContractId = mpcContractId;
  }

  /**
   * Request a signature from the NEAR MPC network.
   * Note: The `payload` must be exactly 32 bytes (e.g., a keccak256 hash).
   */
  async sign(request: ChainSignatureRequest): Promise<ChainSignatureResult> {
    console.log(`[NearChainSigs] Requesting signature for path: ${request.path}`);

    // Ensure payload is an array of 32 bytes
    let payloadArray: number[];
    if (typeof request.payload === 'string') {
      // If it's a hex string, assume it's a hash and convert to byte array
      const cleanHex = request.payload.startsWith('0x') ? request.payload.slice(2) : request.payload;
      payloadArray = Array.from(Buffer.from(cleanHex, 'hex'));

      if (payloadArray.length !== 32) {
        throw new Error('[NearChainSigs] Payload string must represent exactly 32 bytes (a hash)');
      }
    } else {
      payloadArray = Array.from(request.payload);
      if (payloadArray.length !== 32) {
        throw new Error('[NearChainSigs] Payload Uint8Array must be exactly 32 bytes');
      }
    }

    try {
      // Call the MPC contract
      const result = await this.account.functionCall({
        contractId: this.mpcContractId,
        methodName: 'sign',
        args: {
          request: {
            payload: payloadArray,
            path: request.path,
            key_version: request.keyVersion ?? 0,
          },
        },
        // Attached gas and deposit required by the MPC contract
        gas: new BN('300000000000000') as any, // 300 TGas
        attachedDeposit: new BN('1') as any,   // Requires 1 yoctoNEAR
      });

      // Parse the resulting signature
      // The MPC contract returns an array of two strings: [big_r, s], and a recovery_id
      const responseValue = Buffer.from((result.status as any).SuccessValue || '', 'base64').toString('utf8');
      const signatureData = JSON.parse(responseValue);

      // Construct a standard hex signature (r + s + v)
      // Note: In a production environment, proper ASN.1/DER or raw SECP256k1 formatting is required.
      // This is a simplified reconstruction for the abstraction layer.
      const r = signatureData.big_r.affine_point.substring(2);
      const s = signatureData.s;
      const v = signatureData.recovery_id;

      // Ensure proper padding
      const rPadded = r.padStart(64, '0');
      const sPadded = s.padStart(64, '0');

      return {
        signature: `0x${rPadded}${sPadded}`,
        recoveryId: v,
      };

    } catch (error: any) {
      console.error('[NearChainSigs] MPC Signature request failed:', error);
      throw new Error(`Failed to obtain Chain Signature: ${error.message}`);
    }
  }

  /**
   * Derives the public EVM address for a specific derivation path.
   * This is computed deterministically off-chain based on the master public key
   * of the MPC contract, the caller's Account ID, and the path.
   */
  async deriveEvmAddress(path: string): Promise<string> {
    // Note: Actual deterministic derivation requires the master public key
    // and elliptic curve math (e.g., using `near-ca` or similar library).
    // For this abstraction, we simulate the interface.

    console.log(`[NearChainSigs] Deriving EVM address for ${this.account.accountId} at path ${path}`);

    // Simulate deterministic derivation by hashing the inputs
    const input = `${this.mpcContractId}:${this.account.accountId}:${path}`;
    const hash = keccak256(Buffer.from(input, 'utf-8'));

    // An EVM address is 20 bytes (40 hex chars)
    return `0x${hash.substring(2, 42)}`;
  }
}
