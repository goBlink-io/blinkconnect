import React, { useEffect, type ReactNode } from 'react';
import {
  SuiClientProvider,
  WalletProvider as SuiWalletProvider,
} from '@mysten/dapp-kit';
import { useSuiAdapter } from '../../adapters/sui';
import type { BlinkConnectConfig, AdapterHookResult, ChainType } from '../../core/types';

const suiNetworks = {
  mainnet: { url: 'https://fullnode.mainnet.sui.io:443', network: 'mainnet' as const },
  testnet: { url: 'https://fullnode.testnet.sui.io:443', network: 'testnet' as const },
  devnet: { url: 'https://fullnode.devnet.sui.io:443', network: 'devnet' as const },
};

interface SuiProviderProps {
  children: ReactNode;
  config: BlinkConnectConfig;
  onAdapter: (chain: ChainType, adapter: AdapterHookResult) => void;
}

function SuiAdapterBridge({ onAdapter }: { onAdapter: (chain: ChainType, adapter: AdapterHookResult) => void }) {
  const adapter = useSuiAdapter();

  useEffect(() => {
    onAdapter('sui', adapter);
  }, [adapter.address, adapter.connected]);

  return null;
}

export default function SuiProvider({ children, config, onAdapter }: SuiProviderProps) {
  const suiNetwork = config.suiNetwork || 'mainnet';
  const persistSession = config.features?.persistSession ?? false;

  return (
    <SuiClientProvider networks={suiNetworks} defaultNetwork={suiNetwork}>
      <SuiWalletProvider autoConnect={persistSession}>
        <SuiAdapterBridge onAdapter={onAdapter} />
        {children}
      </SuiWalletProvider>
    </SuiClientProvider>
  );
}
