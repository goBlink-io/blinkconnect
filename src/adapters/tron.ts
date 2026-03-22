import { useCallback } from 'react';
import { useWallet as useTronWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import type { AdapterHookResult } from '../core/types';

/**
 * TRON adapter — uses @tronweb3/tronwallet-adapter-react-hooks.
 */
export function useTronAdapter(): AdapterHookResult {
  const {
    address,
    connected,
    disconnect: tronDisconnect,
    select,
    wallets,
    connect: tronConnect,
  } = useTronWallet();

  const connect = useCallback(async () => {
    if (wallets?.length) {
      select(wallets[0].adapter.name);
      await tronConnect();
    }
  }, [select, wallets, tronConnect]);

  const disconnect = useCallback(async () => {
    await tronDisconnect();
  }, [tronDisconnect]);

  return {
    chain: 'tron',
    address: connected ? address ?? null : null,
    connected,
    transport: connected ? 'injected' : null,
    connect,
    disconnect,
  };
}
