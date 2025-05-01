"use client";

import { useBitteWallet } from '@bitte-ai/react';
import { useCallback, useEffect, useState } from 'react';

export interface NearWalletState {
  isConnected: boolean;
  accountId: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useNearWallet() {
  const { selector, modal, accounts, accountId } = useBitteWallet();
  const [state, setState] = useState<NearWalletState>({
    isConnected: false,
    accountId: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const checkConnection = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));

        // Extract account ID from accounts array if available
        let extractedAccountId = null;
        if (accounts && accounts.length > 0) {
          // Try to get the account ID from the first account in the array
          if (accounts[0].accountId) {
            extractedAccountId = accounts[0].accountId;
          } else {
            // If accountId is not directly available, try to access it through account_id or id
            extractedAccountId = accounts[0].account_id || accounts[0].id;
          }
        }

        // Use either the extracted account ID or the one from the hook
        const finalAccountId = accountId || extractedAccountId;

        if (accounts && accounts.length > 0 && finalAccountId) {
          setState({
            isConnected: true,
            accountId: finalAccountId,
            isLoading: false,
            error: null,
          });
        } else if (accounts && accounts.length > 0) {
          // If we have accounts but no account ID, we're still connected but can't identify the account
          setState({
            isConnected: true,
            accountId: 'Unknown NEAR Account',
            isLoading: false,
            error: null,
          });
        } else {
          setState({
            isConnected: false,
            accountId: null,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        setState({
          isConnected: false,
          accountId: null,
          isLoading: false,
          error: 'Failed to connect to wallet',
        });
      }
    };

    checkConnection();

    // Set up an interval to periodically check the connection
    // This helps ensure the UI stays in sync with the actual wallet state
    const intervalId = setInterval(checkConnection, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }, [accounts, accountId]);

  const connect = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Show the modal
      modal.show();

      // Add a listener for when the modal is closed
      const checkConnectionAfterModalClose = () => {
        // If we have accounts but no connection, force a connection check
        if (accounts && accounts.length > 0) {
          // Extract account ID from accounts array if available
          let extractedAccountId = null;
          if (accounts[0].accountId) {
            extractedAccountId = accounts[0].accountId;
          } else {
            extractedAccountId = accounts[0].account_id || accounts[0].id;
          }

          if (extractedAccountId) {
            setState({
              isConnected: true,
              accountId: extractedAccountId,
              isLoading: false,
              error: null,
            });
          }
        }
      };

      // Set a timeout to check connection after modal is likely closed
      setTimeout(checkConnectionAfterModalClose, 3000);

    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to connect to wallet'
      }));
    }
  }, [modal, accounts]);

  const disconnect = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const wallet = await selector.wallet();
      await wallet.signOut();

      setState({
        isConnected: false,
        accountId: null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to disconnect wallet'
      }));
    }
  }, [selector]);

  const signAndSendTransaction = useCallback(async (receiverId: string, actions: any[]) => {
    try {
      if (!accountId) {
        throw new Error('Wallet not connected');
      }

      const wallet = await selector.wallet();
      return await wallet.signAndSendTransaction({
        receiverId,
        actions,
      });
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  }, [selector, accountId]);

  return {
    ...state,
    connect,
    disconnect,
    signAndSendTransaction,
    selector,
    modal,
  };
}
