import { useCallback } from 'react';
import {
  useCurrentAccount as useSuiAccount,
  useDisconnectWallet as useSuiDisconnect,
} from '@mysten/dapp-kit';
import type { AdapterHookResult } from '../core/types';

/**
 * Sui adapter — uses @mysten/dapp-kit.
 * Note: Sui connect is handled via the SuiConnectButton rendered in the modal.
 */
export function useSuiAdapter(): AdapterHookResult {
  const suiAccount = useSuiAccount();
  const { mutate: suiDisconnect } = useSuiDisconnect();

  const connect = useCallback(async () => {
    // Sui connection is handled via the dapp-kit ConnectButton in the modal.
    // This is a no-op — the modal renders the Sui connect button directly.
  }, []);

  const disconnect = useCallback(async () => {
    suiDisconnect();
  }, [suiDisconnect]);

  return {
    chain: 'sui',
    address: suiAccount?.address ?? null,
    connected: !!suiAccount?.address,
    transport: suiAccount?.address ? 'injected' : null,
    connect,
    disconnect,
  };
}
