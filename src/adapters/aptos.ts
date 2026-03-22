import { useCallback } from 'react';
import { useWallet as useAptosWallet } from '@aptos-labs/wallet-adapter-react';
import type { AdapterHookResult } from '../core/types';

/**
 * Aptos adapter — uses @aptos-labs/wallet-adapter-react.
 */
export function useAptosAdapter(): AdapterHookResult {
  const {
    account,
    connected,
    disconnect: aptosDisconnect,
    connect: aptosConnect,
    wallets,
  } = useAptosWallet();

  const connect = useCallback(async () => {
    if (wallets?.length) {
      await aptosConnect((wallets[0] as any).name || wallets[0]);
    }
  }, [aptosConnect, wallets]);

  const disconnect = useCallback(async () => {
    await aptosDisconnect();
  }, [aptosDisconnect]);

  return {
    chain: 'aptos',
    address: connected ? account?.address?.toString() ?? null : null,
    connected,
    transport: connected ? 'injected' : null,
    connect,
    disconnect,
  };
}
