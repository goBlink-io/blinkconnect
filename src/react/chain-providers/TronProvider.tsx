import React, { useEffect, type ReactNode } from 'react';
import { WalletProvider as TronWalletProvider } from '@tronweb3/tronwallet-adapter-react-hooks';
import { TronLinkAdapter } from '@tronweb3/tronwallet-adapters';
import { useTronAdapter } from '../../adapters/tron';
import type { BlinkConnectConfig, AdapterHookResult, ChainType } from '../../core/types';

const tronAdapters = [new TronLinkAdapter()];

interface TronProviderProps {
  children: ReactNode;
  config: BlinkConnectConfig;
  onAdapter: (chain: ChainType, adapter: AdapterHookResult) => void;
}

function TronAdapterBridge({ onAdapter }: { onAdapter: (chain: ChainType, adapter: AdapterHookResult) => void }) {
  const adapter = useTronAdapter();

  useEffect(() => {
    onAdapter('tron', adapter);
  }, [adapter.address, adapter.connected]);

  return null;
}

export default function TronProvider({ children, config, onAdapter }: TronProviderProps) {
  const persistSession = config.features?.persistSession ?? false;

  return (
    <TronWalletProvider adapters={tronAdapters} autoConnect={persistSession}>
      <TronAdapterBridge onAdapter={onAdapter} />
      {children}
    </TronWalletProvider>
  );
}
