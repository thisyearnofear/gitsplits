import type { NextApiRequest, NextApiResponse } from 'next';
import { KeyPair, keyStores, connect, utils } from 'near-api-js';

// This is a simplified implementation for demonstration purposes
// In a real implementation, you would need to generate a proper attestation quote

type ResponseData = {
  success: boolean;
  message?: string;
  worker_id?: string;
  attestation_id?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    // Get contract ID from environment variables
    const contractId = process.env.NEXT_PUBLIC_contractId;
    if (!contractId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Contract ID is not defined in environment variables' 
      });
    }

    // Generate a new key pair for the worker agent
    const keyPair = KeyPair.fromRandom('ed25519');
    const publicKey = keyPair.getPublicKey().toString();
    const privateKey = keyPair.toString();

    // In a real TEE implementation, this key would be generated within the TEE
    // and the private key would never leave the secure enclave

    // Connect to NEAR
    const keyStore = new keyStores.InMemoryKeyStore();
    await keyStore.setKey('testnet', contractId, keyPair);

    const config = {
      networkId: 'testnet',
      keyStore,
      nodeUrl: 'https://rpc.testnet.near.org',
      walletUrl: 'https://wallet.testnet.near.org',
      helperUrl: 'https://helper.testnet.near.org',
      explorerUrl: 'https://explorer.testnet.near.org',
    };

    const near = await connect(config);
    const account = await near.account(contractId);

    // Generate a mock attestation (in a real implementation, this would be a proper TEE attestation)
    const mockAttestation = {
      quote: utils.serialize.base_encode(Buffer.from('mock_quote')),
      endorsements: utils.serialize.base_encode(Buffer.from('mock_endorsements')),
    };

    // Generate a mock code hash (in a real implementation, this would be the SHA256 hash of the Docker image)
    const mockCodeHash = 'mock_code_hash_' + Date.now().toString();

    // Call the register_worker method on the contract
    const result = await account.functionCall({
      contractId,
      methodName: 'register_worker',
      args: {
        attestation: mockAttestation,
        code_hash: mockCodeHash,
      },
      gas: '300000000000000', // 300 TGas
      attachedDeposit: '0',
    });

    // Return success response
    return res.status(200).json({
      success: true,
      worker_id: publicKey,
      attestation_id: mockCodeHash,
      message: 'Worker agent registered successfully',
    });
  } catch (error) {
    console.error('Error registering worker agent:', error);
    return res.status(500).json({
      success: false,
      message: `Error registering worker agent: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
