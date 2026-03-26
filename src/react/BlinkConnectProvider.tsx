import React, {
  lazy,
  Suspense,
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import type {
  BlinkConnectConfig,
  ChainType,
  ConnectedWallet,
  AdapterHookResult,
  ConnectOptions,
} from '../core/types';
import { ChainErrorBoundary } from './ChainErrorBoundary';

// ── Core SDK Imports (always required) ──
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { mainnet, polygon, optimism, arbitrum, base, sepolia, bsc, gnosis, avalanche } from 'wagmi/chains';
import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks';

// Core adapters (EVM/Solana/Bitcoin + NEAR — no provider wrapper needed)
import { useEvmAdapter } from '../adapters/evm';
import { useNearAdapter } from '../adapters/near';
import { createNoopAdapter } from '../adapters/base';

// ── Lazy Chain Providers ──
// Only loaded when the chain is in config.chains

const CHAIN_PROVIDER_LOADERS: Partial<Record<ChainType, () => Promise<{ default: React.ComponentType<any> }>>> = {
  sui: () => import('./chain-providers/SuiProvider'),
  aptos: () => import('./chain-providers/AptosProvider'),
  starknet: () => import('./chain-providers/StarknetProvider'),
  ton: () => import('./chain-providers/TonProvider'),
  tron: () => import('./chain-providers/TronProvider'),
};

// ── Context Types ──

export interface BlinkWalletContextType {
  /** All currently connected wallets */
  connectedWallets: ConnectedWallet[];

  /** Get address for a specific chain */
  getAddressForChain: (chain: ChainType) => string | null;

  /** Check if a chain is connected */
  isChainConnected: (chain: ChainType) => boolean;

  /** Whether any wallet is connected */
  isConnected: boolean;

  /** Primary connected wallet address */
  address: string | null;

  /** Primary connected wallet chain */
  chain: ChainType | null;

  /** Modal state */
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;

  /** Connect a specific chain */
  connect: (chain?: ChainType) => Promise<void>;

  /** Disconnect a specific chain or all */
  disconnect: (chain?: ChainType) => Promise<void>;

  /** Disconnect all chains */
  disconnectAll: () => Promise<void>;

  /** Raw adapter results for advanced usage */
  adapters: Record<ChainType, AdapterHookResult>;

  /** Config */
  config: BlinkConnectConfig;
}

const BlinkWalletContext = createContext<BlinkWalletContextType | undefined>(undefined);

// ── AppKit Initialization ──

let appKitInitialized = false;

function initAppKit(config: BlinkConnectConfig) {
  if (appKitInitialized) return;
  appKitInitialized = true;

  const evmChains = [
    mainnet, polygon, optimism, arbitrum, base, bsc, avalanche, gnosis, sepolia,
    ...(config.evmChains || []),
  ] as any[];

  const wagmiAdapter = new WagmiAdapter({ networks: evmChains, projectId: config.projectId });
  const solanaAdapter = new SolanaAdapter({ wallets: [] });

  const metadata = {
    name: config.appName || 'BlinkConnect App',
    description: 'Multi-chain wallet connection',
    url: config.appUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://goblink.io'),
    icons: config.appIcon ? [config.appIcon] : ['https://goblink.io/icon.png'],
  };

  createAppKit({
    adapters: [wagmiAdapter, solanaAdapter],
    networks: [
      mainnet, polygon, optimism, arbitrum, base, bsc, sepolia,
      solana, solanaTestnet, solanaDevnet,
    ] as any,
    projectId: config.projectId,
    metadata,
    features: {
      analytics: config.features?.analytics ?? false,
      email: config.features?.socialLogin ?? true,
      socials: ['google', 'apple', 'discord', 'x', 'github', 'farcaster'],
    },
    themeMode: config.theme === 'auto' ? undefined : (config.theme || 'light'),
    enableWalletConnect: true,
    enableInjected: true,
    enableCoinbase: true,
    featuredWalletIds: [
      'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
      'a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393', // Phantom
      '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
      'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e18e4a33e02bbbb5f7', // Coinbase Wallet
    ],
  } as any);

  return wagmiAdapter;
}

// ── Provider Stack ──

const queryClient = new QueryClient();

interface ChainProvidersProps {
  config: BlinkConnectConfig;
  onAdapter: (chain: ChainType, adapter: AdapterHookResult) => void;
  children: ReactNode;
}

/**
 * Dynamically wraps children in chain-specific providers based on config.chains.
 * Uses React.lazy() so chain SDKs are only imported when needed.
 * Each provider is wrapped in an error boundary so a missing/broken SDK
 * doesn't crash the entire app — that chain just won't be available.
 */
function ChainProviders({ config, onAdapter, children }: ChainProvidersProps) {
  const enabledChains = config.chains;
  const isEnabled = (chain: ChainType) => !enabledChains || enabledChains.includes(chain);

  // Memoize lazy components so they're stable across renders
  const LazyProviders = useMemo(() => {
    const providers: Array<{
      chain: ChainType;
      Component: React.LazyExoticComponent<React.ComponentType<any>>;
    }> = [];

    for (const [chain, loader] of Object.entries(CHAIN_PROVIDER_LOADERS)) {
      if (isEnabled(chain as ChainType)) {
        providers.push({
          chain: chain as ChainType,
          Component: lazy(loader!),
        });
      }
    }

    return providers;
  }, [enabledChains?.join(',')]);

  // Nest providers: [A, B, C] → <A><B><C>{children}</C></B></A>
  let wrapped: ReactNode = children;

  for (let i = LazyProviders.length - 1; i >= 0; i--) {
    const { chain, Component } = LazyProviders[i];
    const inner = wrapped;
    wrapped = (
      <ChainErrorBoundary chain={chain} onError={config.onError ? (err) => config.onError!(err, chain) : undefined}>
        <Suspense fallback={inner}>
          <Component config={config} onAdapter={onAdapter}>
            {inner}
          </Component>
        </Suspense>
      </ChainErrorBoundary>
    );
  }

  return <>{wrapped}</>;
}

// ── Unified State Layer ──

function UnifiedWalletLayer({ config, children }: { config: BlinkConnectConfig; children: ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const enabledChains = config.chains;
  const isEnabled = (chain: ChainType) => !enabledChains || enabledChains.includes(chain);

  // Adapter state from lazy chain providers — collected via callbacks
  const [chainAdapters, setChainAdapters] = useState<Partial<Record<ChainType, AdapterHookResult>>>({});

  const handleAdapterUpdate = useCallback((chain: ChainType, adapter: AdapterHookResult) => {
    setChainAdapters((prev) => {
      // Only update if something actually changed to avoid render loops
      const existing = prev[chain];
      if (existing && existing.address === adapter.address && existing.connected === adapter.connected) {
        return prev;
      }
      return { ...prev, [chain]: adapter };
    });
  }, []);

  // Core adapters (always loaded — EVM/Solana/Bitcoin share AppKit, NEAR is lightweight)
  const evmResult = useEvmAdapter();
  const nearResult = isEnabled('near') ? useNearAdapter({ networkId: config.nearNetwork }) : createNoopAdapter('near');

  // Build unified adapters map: core + lazy-loaded chain adapters
  const adapters: Record<ChainType, AdapterHookResult> = useMemo(
    () => ({
      evm: evmResult.evm,
      solana: evmResult.solana,
      bitcoin: evmResult.bitcoin,
      sui: chainAdapters.sui || createNoopAdapter('sui'),
      near: nearResult,
      aptos: chainAdapters.aptos || createNoopAdapter('aptos'),
      starknet: chainAdapters.starknet || createNoopAdapter('starknet'),
      ton: chainAdapters.ton || createNoopAdapter('ton'),
      tron: chainAdapters.tron || createNoopAdapter('tron'),
    }),
    [evmResult, nearResult, chainAdapters]
  );

  // Build connected wallets list
  const connectedWallets = useMemo(() => {
    const wallets: ConnectedWallet[] = [];
    for (const [chain, adapter] of Object.entries(adapters)) {
      if (adapter.connected && adapter.address && isEnabled(chain as ChainType)) {
        wallets.push({ chain: chain as ChainType, address: adapter.address });
      }
    }
    return wallets;
  }, [adapters]);

  const getAddressForChain = useCallback(
    (chain: ChainType): string | null => adapters[chain]?.address ?? null,
    [adapters]
  );

  const isChainConnected = useCallback(
    (chain: ChainType): boolean => !!adapters[chain]?.connected,
    [adapters]
  );

  const connect = useCallback(
    async (chain?: ChainType) => {
      if (chain && adapters[chain]) {
        await adapters[chain].connect();
      } else {
        setIsModalOpen(true);
      }
    },
    [adapters]
  );

  const disconnect = useCallback(
    async (chain?: ChainType) => {
      if (chain && adapters[chain]) {
        await adapters[chain].disconnect();
      } else {
        for (const adapter of Object.values(adapters)) {
          if (adapter.connected) {
            try {
              await adapter.disconnect();
            } catch {
              // Silent — best effort disconnect
            }
          }
        }
      }
    },
    [adapters]
  );

  const disconnectAll = useCallback(async () => {
    for (const adapter of Object.values(adapters)) {
      if (adapter.connected) {
        try {
          await adapter.disconnect();
        } catch {
          // Silent — best effort disconnect
        }
      }
    }
  }, [adapters]);

  // Primary wallet = first connected
  const primaryWallet = connectedWallets[0] ?? null;

  const value: BlinkWalletContextType = useMemo(
    () => ({
      connectedWallets,
      getAddressForChain,
      isChainConnected,
      isConnected: connectedWallets.length > 0,
      address: primaryWallet?.address ?? null,
      chain: primaryWallet?.chain ?? null,
      isModalOpen,
      openModal: () => setIsModalOpen(true),
      closeModal: () => setIsModalOpen(false),
      connect,
      disconnect,
      disconnectAll,
      adapters,
      config,
    }),
    [connectedWallets, isModalOpen, adapters, config]
  );

  return (
    <BlinkWalletContext.Provider value={value}>
      <ChainProviders config={config} onAdapter={handleAdapterUpdate}>
        {children}
      </ChainProviders>
      {isModalOpen && <ConnectModalPortal />}
    </BlinkWalletContext.Provider>
  );
}

// ── Connect Modal (lazy loaded) ──
const LazyConnectModal = lazy(() =>
  import('./ConnectModal').then((m) => ({ default: m.ConnectModal }))
);

function ConnectModalPortal() {
  return (
    <Suspense fallback={null}>
      <LazyConnectModal />
    </Suspense>
  );
}

// ── Public Provider ──

export interface BlinkConnectProviderProps {
  config: BlinkConnectConfig;
  children: ReactNode;
}

// Store wagmi adapter at module level to avoid re-creation
let cachedWagmiAdapter: WagmiAdapter | null = null;

export function BlinkConnectProvider({ config, children }: BlinkConnectProviderProps) {
  if (!cachedWagmiAdapter) {
    const adapter = initAppKit(config);
    if (adapter) cachedWagmiAdapter = adapter;
  }

  if (!cachedWagmiAdapter) {
    const evmChains = [mainnet, polygon, optimism, arbitrum, base, bsc, avalanche, gnosis, sepolia] as any[];
    cachedWagmiAdapter = new WagmiAdapter({ networks: evmChains, projectId: config.projectId });
  }

  return (
    <WagmiProvider config={cachedWagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <UnifiedWalletLayer config={config}>{children}</UnifiedWalletLayer>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// ── Hook to access context ──

export function useBlinkWalletContext(): BlinkWalletContextType {
  const ctx = useContext(BlinkWalletContext);
  if (!ctx) {
    throw new Error('useBlinkWalletContext must be used within <BlinkConnectProvider>');
  }
  return ctx;
}
