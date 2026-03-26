import React, { useEffect, type ReactNode } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { useTonAdapter } from '../../adapters/ton';
import type { BlinkConnectConfig, AdapterHookResult, ChainType } from '../../core/types';

interface TonProviderProps {
  children: ReactNode;
  config: BlinkConnectConfig;
  onAdapter: (chain: ChainType, adapter: AdapterHookResult) => void;
}

function TonAdapterBridge({ onAdapter }: { onAdapter: (chain: ChainType, adapter: AdapterHookResult) => void }) {
  const adapter = useTonAdapter();

  useEffect(() => {
    onAdapter('ton', adapter);
  }, [adapter.address, adapter.connected]);

  return null;
}

export default function TonProvider({ children, config, onAdapter }: TonProviderProps) {
  const tonManifestUrl =
    config.tonManifestUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/tonconnect-manifest.json`
      : 'https://goblink.io/tonconnect-manifest.json');

  return (
    <TonConnectUIProvider manifestUrl={tonManifestUrl}>
      <TonAdapterBridge onAdapter={onAdapter} />
      {children}
    </TonConnectUIProvider>
  );
}
