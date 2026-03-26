import React, { useEffect, type ReactNode } from 'react';
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import { useAptosAdapter } from '../../adapters/aptos';
import type { BlinkConnectConfig, AdapterHookResult, ChainType } from '../../core/types';

interface AptosProviderProps {
  children: ReactNode;
  config: BlinkConnectConfig;
  onAdapter: (chain: ChainType, adapter: AdapterHookResult) => void;
}

function AptosAdapterBridge({ onAdapter }: { onAdapter: (chain: ChainType, adapter: AdapterHookResult) => void }) {
  const adapter = useAptosAdapter();

  useEffect(() => {
    onAdapter('aptos', adapter);
  }, [adapter.address, adapter.connected]);

  return null;
}

export default function AptosProvider({ children, config, onAdapter }: AptosProviderProps) {
  const persistSession = config.features?.persistSession ?? false;

  return (
    <AptosWalletAdapterProvider autoConnect={persistSession}>
      <AptosAdapterBridge onAdapter={onAdapter} />
      {children}
    </AptosWalletAdapterProvider>
  );
}
