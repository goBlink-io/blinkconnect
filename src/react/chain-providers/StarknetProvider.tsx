import React, { useEffect, type ReactNode } from 'react';
import { StarknetConfig, publicProvider, InjectedConnector } from '@starknet-react/core';
import { mainnet as starknetMainnet } from '@starknet-react/chains';
import { useStarknetAdapter } from '../../adapters/starknet';
import type { BlinkConnectConfig, AdapterHookResult, ChainType } from '../../core/types';

const starknetConnectors = [
  new InjectedConnector({ options: { id: 'argentX' } }),
  new InjectedConnector({ options: { id: 'braavos' } }),
];

interface StarknetProviderProps {
  children: ReactNode;
  config: BlinkConnectConfig;
  onAdapter: (chain: ChainType, adapter: AdapterHookResult) => void;
}

function StarknetAdapterBridge({ onAdapter }: { onAdapter: (chain: ChainType, adapter: AdapterHookResult) => void }) {
  const adapter = useStarknetAdapter();

  useEffect(() => {
    onAdapter('starknet', adapter);
  }, [adapter.address, adapter.connected]);

  return null;
}

export default function StarknetProvider({ children, config, onAdapter }: StarknetProviderProps) {
  return (
    <StarknetConfig
      chains={[starknetMainnet]}
      provider={publicProvider()}
      connectors={starknetConnectors as any}
    >
      <StarknetAdapterBridge onAdapter={onAdapter} />
      {children}
    </StarknetConfig>
  );
}
