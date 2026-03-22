import { useCallback } from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import type { AdapterHookResult } from '../core/types';

/**
 * TON adapter — uses @tonconnect/ui-react.
 */
export function useTonAdapter(): AdapterHookResult {
  const [tonConnectUI] = useTonConnectUI();
  const tonAddr = useTonAddress();

  const connect = useCallback(async () => {
    await tonConnectUI.openModal();
  }, [tonConnectUI]);

  const disconnect = useCallback(async () => {
    await tonConnectUI.disconnect();
  }, [tonConnectUI]);

  return {
    chain: 'ton',
    address: tonAddr || null,
    connected: !!tonAddr,
    transport: tonAddr ? 'tonconnect' : null,
    connect,
    disconnect,
  };
}
