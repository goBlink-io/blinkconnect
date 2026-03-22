export type ChainType =
  | 'evm'
  | 'solana'
  | 'sui'
  | 'near'
  | 'bitcoin'
  | 'aptos'
  | 'starknet'
  | 'ton'
  | 'tron';

export interface ConnectedWallet {
  chain: ChainType;
  address: string;
}

export interface WalletState {
  wallets: ConnectedWallet[];
  isModalOpen: boolean;
}

export interface ConnectOptions {
  /** Specific wallet to connect (adapter-dependent) */
  wallet?: string;
  /** Force a specific transport (default: auto-detect based on platform) */
  transport?: 'injected' | 'walletconnect' | 'zklogin' | 'tonconnect';
  /** Chain-specific options */
  chainOptions?: Record<string, unknown>;
}

export interface ChainAdapter {
  readonly chain: ChainType;
  readonly connected: boolean;
  readonly address: string | null;

  connect(options?: ConnectOptions): Promise<string | null>;
  disconnect(): Promise<void>;
  signMessage?(message: string): Promise<string>;
  signTransaction?(tx: unknown): Promise<string>;
  getBalance?(): Promise<{ native: string; symbol: string }>;

  on?(event: 'connect' | 'disconnect' | 'accountChanged', cb: (...args: unknown[]) => void): void;
  off?(event: string, cb: (...args: unknown[]) => void): void;
}

/** Result from a useAdapter hook */
export interface AdapterHookResult {
  chain: ChainType;
  address: string | null;
  connected: boolean;
  /** Which transport is being used for this connection */
  transport: 'injected' | 'walletconnect' | 'zklogin' | 'tonconnect' | null;
  connect: (options?: ConnectOptions) => Promise<void>;
  disconnect: () => Promise<void>;
}

export interface BlinkConnectConfig {
  /** WalletConnect / ReOwn project ID */
  projectId: string;

  /** Which chains to enable (default: all) */
  chains?: ChainType[];

  /** UI theme */
  theme?: 'light' | 'dark' | 'auto';

  /** App name shown in wallet prompts */
  appName?: string;

  /** App icon URL */
  appIcon?: string;

  /** App URL */
  appUrl?: string;

  /** Custom EVM chains */
  evmChains?: unknown[];

  /** Custom RPC URLs by chain ID */
  rpcUrls?: Record<number, string>;

  /** NEAR network */
  nearNetwork?: 'mainnet' | 'testnet';

  /** Sui network */
  suiNetwork?: 'mainnet' | 'testnet' | 'devnet';

  /** TON Connect manifest URL */
  tonManifestUrl?: string;

  /** Feature flags */
  features?: {
    multiConnect?: boolean;
    persistSession?: boolean;
    socialLogin?: boolean;
    analytics?: boolean;
    /** Enable WalletConnect transport (default: true on mobile, false on desktop) */
    walletConnect?: boolean;
    /** Allow linking multiple wallets across chains (default: true) */
    sessionLinking?: boolean;
  };

  /** Callbacks */
  onConnect?: (wallet: ConnectedWallet) => void;
  onDisconnect?: (chain: ChainType) => void;
  onError?: (error: Error, chain: ChainType) => void;
}

export type WalletEvent = 'connect' | 'disconnect' | 'chainChanged' | 'accountChanged' | 'error';

export interface WalletEventMap {
  connect: ConnectedWallet;
  disconnect: ChainType;
  chainChanged: { chain: ChainType; address: string };
  accountChanged: { chain: ChainType; address: string };
  error: { error: Error; chain: ChainType };
}
