import { useState, useEffect, useCallback } from 'react';
import { NearConnector } from '@hot-labs/near-connect';
import type { AdapterHookResult } from '../core/types';

export interface NearAdapterOptions {
  networkId?: string;
}

/**
 * NEAR adapter — uses @hot-labs/near-connect.
 */
export function useNearAdapter(options?: NearAdapterOptions): AdapterHookResult {
  const [address, setAddress] = useState<string | null>(null);
  const [connector, setConnector] = useState<NearConnector | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const nc = new NearConnector({
      networkId: options?.networkId || 'mainnet',
      network: options?.networkId || 'mainnet',
      logger: { log: console.log, error: console.error },
    } as any);

    setConnector(nc);

    // Check existing connection
    const checkConnection = async () => {
      try {
        const wallet = await nc.wallet().catch(() => null);
        if (!wallet) return;
        const accounts = await (wallet as any).getAccounts?.();
        if (accounts?.length > 0) {
          const accountId = accounts[0].accountId || accounts[0];
          if (typeof accountId === 'string') setAddress(accountId);
        }
      } catch {}
    };

    const timer = setTimeout(checkConnection, 500);

    const onSignIn = async () => {
      try {
        const wallet = await nc.wallet().catch(() => null);
        if (!wallet) return;
        const accounts = await (wallet as any).getAccounts?.();
        if (accounts?.length > 0) {
          const accountId = accounts[0].accountId || accounts[0];
          if (typeof accountId === 'string') setAddress(accountId);
        }
      } catch {}
    };
    const onSignOut = () => setAddress(null);

    nc.on('wallet:signIn', onSignIn);
    nc.on('wallet:signOut', onSignOut);

    return () => {
      clearTimeout(timer);
      nc.off('wallet:signIn', onSignIn);
      nc.off('wallet:signOut', onSignOut);
    };
  }, [options?.networkId]);

  const connect = useCallback(async () => {
    if (!connector) {
      console.error('[BlinkConnect] NEAR connector not ready');
      return;
    }
    console.log('[BlinkConnect] Connecting NEAR wallet...');
    const wallet = await connector.connect();
    const accounts = await (wallet as any).getAccounts?.();
    if (accounts?.length > 0) {
      const accountId = accounts[0].accountId || accounts[0];
      if (typeof accountId === 'string') setAddress(accountId);
    }
  }, [connector]);

  const disconnect = useCallback(async () => {
    if (!connector) return;
    await connector.disconnect();
    setAddress(null);
  }, [connector]);

  return {
    chain: 'near',
    address,
    connected: !!address,
    transport: address ? 'injected' : null,
    connect,
    disconnect,
  };
}
