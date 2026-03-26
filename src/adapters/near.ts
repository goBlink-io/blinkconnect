import { useState, useEffect, useCallback } from 'react';
import { NearConnector } from '@hot-labs/near-connect';
import type { AdapterHookResult } from '../core/types';

export interface NearAdapterOptions {
  networkId?: string;
}

/** Minimal type for the NearConnector wallet interface */
interface NearWallet {
  getAccounts?: () => Promise<Array<{ accountId: string } | string>>;
}

/** Extract account ID from a wallet accounts entry */
function extractAccountId(entry: { accountId: string } | string): string | null {
  if (typeof entry === 'string') return entry;
  if (typeof entry === 'object' && typeof entry.accountId === 'string') return entry.accountId;
  return null;
}

/** Resolve the first account ID from a wallet, with timeout */
async function resolveAccountId(wallet: NearWallet, timeoutMs = 10_000): Promise<string | null> {
  if (!wallet.getAccounts) return null;

  const result = await Promise.race([
    wallet.getAccounts(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);

  if (!result || !Array.isArray(result) || result.length === 0) return null;
  return extractAccountId(result[0]);
}

/**
 * NEAR adapter — uses @hot-labs/near-connect.
 */
export function useNearAdapter(options?: NearAdapterOptions): AdapterHookResult {
  const [address, setAddress] = useState<string | null>(null);
  const [connector, setConnector] = useState<NearConnector | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const networkId = options?.networkId || 'mainnet';

    const nc = new NearConnector({
      networkId,
      network: networkId,
      logger: { log: console.log, error: console.error },
    } as ConstructorParameters<typeof NearConnector>[0]);

    setConnector(nc);

    // Check existing connection
    const checkConnection = async () => {
      try {
        const wallet = await nc.wallet() as NearWallet | null;
        if (!wallet) return;
        const accountId = await resolveAccountId(wallet);
        if (accountId) setAddress(accountId);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn('[BlinkConnect] NEAR check connection:', message);
      }
    };

    const timer = setTimeout(checkConnection, 500);

    const onSignIn = async () => {
      try {
        const wallet = await nc.wallet() as NearWallet | null;
        if (!wallet) return;
        const accountId = await resolveAccountId(wallet);
        if (accountId) setAddress(accountId);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn('[BlinkConnect] NEAR sign-in handler:', message);
      }
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
      console.error('[BlinkConnect] NEAR connector not initialized — wallet SDK may still be loading');
      return;
    }

    console.log('[BlinkConnect] Connecting NEAR wallet...');

    try {
      const wallet = await Promise.race([
        connector.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('NEAR connection timed out after 10s')), 10_000)
        ),
      ]) as NearWallet;

      const accountId = await resolveAccountId(wallet);
      if (accountId) {
        setAddress(accountId);
      } else {
        console.warn('[BlinkConnect] NEAR: connected but no account ID returned');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[BlinkConnect] NEAR connect failed:', message);
    }
  }, [connector]);

  const disconnect = useCallback(async () => {
    if (!connector) return;
    try {
      await connector.disconnect();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[BlinkConnect] NEAR disconnect:', message);
    }
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
