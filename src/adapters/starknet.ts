import { useCallback } from 'react';
import {
  useAccount as useStarknetAccount,
  useDisconnect as useStarknetDisconnect,
  useConnect as useStarknetConnect,
} from '@starknet-react/core';
import type { AdapterHookResult } from '../core/types';

/**
 * Starknet adapter — uses @starknet-react/core.
 */
export function useStarknetAdapter(): AdapterHookResult {
  const { address, isConnected } = useStarknetAccount();
  const { disconnect: starknetDisconnect } = useStarknetDisconnect();
  const { connect: starknetConnect, connectors } = useStarknetConnect();

  const connect = useCallback(async () => {
    if (connectors[0]) {
      starknetConnect({ connector: connectors[0] });
    }
  }, [starknetConnect, connectors]);

  const disconnect = useCallback(async () => {
    starknetDisconnect();
  }, [starknetDisconnect]);

  return {
    chain: 'starknet',
    address: isConnected ? address ?? null : null,
    connected: !!isConnected,
    transport: isConnected ? 'injected' : null,
    connect,
    disconnect,
  };
}

/** Expose connectors for the modal to render wallet choices */
export function useStarknetConnectors() {
  const { connect, connectors } = useStarknetConnect();
  return { connect, connectors };
}
