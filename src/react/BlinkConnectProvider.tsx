import React, {
  lazy,
  Suspense,
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import type {
  BlinkConnectConfig,
  ChainType,
  ConnectedWallet,
  AdapterHookResult,
  ConnectOptions,
} from '../core/types';

// ── Wallet SDK Imports ──
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { mainnet, polygon, optimism, arbitrum, base, sepolia, bsc, gnosis, avalanche } from 'wagmi/chains';
import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks';

// Optional chain providers — wrapped in try/catch at the component level
import { SuiClientProvider, WalletProvider as SuiWalletProvider } from '@mysten/dapp-kit';
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import { StarknetConfig, publicProvider, InjectedConnector } from '@starknet-react/core';
import { mainnet as starknetMainnet } from '@starknet-react/chains';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { WalletProvider as TronWalletProvider } from '@tronweb3/tronwallet-adapter-react-hooks';
import { TronLinkAdapter } from '@tronweb3/tronwallet-adapters';

// Adapters
import { useEvmAdapter } from '../adapters/evm';
import { useSuiAdapter } from '../adapters/sui';
import { useNearAdapter } from '../adapters/near';
import { useAptosAdapter } from '../adapters/aptos';
import { useStarknetAdapter } from '../adapters/starknet';
import { useTonAdapter } from '../adapters/ton';
import { useTronAdapter } from '../adapters/tron';

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

// ── Provider Stack (internal) ──

const queryClient = new QueryClient();

const suiNetworks = {
  mainnet: { url: 'https://fullnode.mainnet.sui.io:443', network: 'mainnet' as const },
  testnet: { url: 'https://fullnode.testnet.sui.io:443', network: 'testnet' as const },
  devnet: { url: 'https://fullnode.devnet.sui.io:443', network: 'devnet' as const },
};

const starknetConnectors = [
  new InjectedConnector({ options: { id: 'argentX' } }),
  new InjectedConnector({ options: { id: 'braavos' } }),
];

const tronAdapters = [new TronLinkAdapter()];

interface ProviderStackProps {
  config: BlinkConnectConfig;
  wagmiAdapter: WagmiAdapter;
  children: ReactNode;
}

function ProviderStack({ config, wagmiAdapter, children }: ProviderStackProps) {
  const suiNetwork = config.suiNetwork || 'mainnet';
  const tonManifestUrl =
    config.tonManifestUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/tonconnect-manifest.json`
      : 'https://goblink.io/tonconnect-manifest.json');

  const enabledChains = config.chains;
  const isEnabled = (chain: ChainType) => !enabledChains || enabledChains.includes(chain);

  // Build the provider tree — only include enabled chains
  let tree = <>{children}</>;

  if (isEnabled('tron')) {
    tree = (
      <TronWalletProvider adapters={tronAdapters} autoConnect={false}>
        {tree}
      </TronWalletProvider>
    );
  }

  if (isEnabled('ton')) {
    tree = <TonConnectUIProvider manifestUrl={tonManifestUrl}>{tree}</TonConnectUIProvider>;
  }

  if (isEnabled('starknet')) {
    tree = (
      <StarknetConfig
        chains={[starknetMainnet]}
        provider={publicProvider()}
        connectors={starknetConnectors as any}
      >
        {tree}
      </StarknetConfig>
    );
  }

  if (isEnabled('aptos')) {
    tree = <AptosWalletAdapterProvider autoConnect={false}>{tree}</AptosWalletAdapterProvider>;
  }

  if (isEnabled('sui')) {
    tree = (
      <SuiClientProvider networks={suiNetworks} defaultNetwork={suiNetwork}>
        <SuiWalletProvider>{tree}</SuiWalletProvider>
      </SuiClientProvider>
    );
  }

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{tree}</QueryClientProvider>
    </WagmiProvider>
  );
}

// ── Unified State Layer ──

function UnifiedWalletLayer({ config, children }: { config: BlinkConnectConfig; children: ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const enabledChains = config.chains;
  const isEnabled = (chain: ChainType) => !enabledChains || enabledChains.includes(chain);

  // Connect all adapters
  const evmResult = useEvmAdapter();
  const suiResult = useSuiAdapter();
  const nearResult = useNearAdapter({ networkId: config.nearNetwork });
  const aptosResult = useAptosAdapter();
  const starknetResult = useStarknetAdapter();
  const tonResult = useTonAdapter();
  const tronResult = useTronAdapter();

  const adapters: Record<ChainType, AdapterHookResult> = useMemo(
    () => ({
      evm: evmResult.evm,
      solana: evmResult.solana,
      bitcoin: evmResult.bitcoin,
      sui: suiResult,
      near: nearResult,
      aptos: aptosResult,
      starknet: starknetResult,
      ton: tonResult,
      tron: tronResult,
    }),
    [evmResult, suiResult, nearResult, aptosResult, starknetResult, tonResult, tronResult]
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
        // Disconnect all
        for (const adapter of Object.values(adapters)) {
          if (adapter.connected) {
            try {
              await adapter.disconnect();
            } catch {}
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
        } catch {}
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
      {children}
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
    // Fallback — create wagmi adapter without AppKit
    const evmChains = [mainnet, polygon, optimism, arbitrum, base, bsc, avalanche, gnosis, sepolia] as any[];
    cachedWagmiAdapter = new WagmiAdapter({ networks: evmChains, projectId: config.projectId });
  }

  return (
    <ProviderStack config={config} wagmiAdapter={cachedWagmiAdapter}>
      <UnifiedWalletLayer config={config}>{children}</UnifiedWalletLayer>
    </ProviderStack>
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
