// Core types
export type {
  ChainType,
  ConnectedWallet,
  BlinkConnectConfig,
  WalletState,
  ChainAdapter,
  ConnectOptions,
  AdapterHookResult,
  WalletEvent,
  WalletEventMap,
} from './core/types';

// Core utilities
export { WalletEventEmitter, globalEvents } from './core/events';
export { createWalletStore } from './core/store';
export type { WalletStore } from './core/store';

// Platform detection
export { detectPlatform, getPlatformInfo, resetPlatformCache } from './core/detector';
export type { Platform, Transport, PlatformInfo } from './core/detector';

// Session management
export { SessionManager } from './core/session';
export type { LinkedSession, WalletEntry } from './core/session';

// Transports
export {
  WalletConnectTransport,
  isAppKitWCChain,
  needsStandaloneWC,
  WC_CHAIN_NAMESPACES,
  WC_CHAIN_IDS,
} from './transports/walletconnect';
export type { WCSession, WCTransportConfig } from './transports/walletconnect';

// Deep links
export { getWalletDeepLink, SUPPORTED_MOBILE_WALLETS } from './utils/deeplinks';
export type { MobileWalletInfo } from './utils/deeplinks';

// Utils
export { formatAddress, truncateAddress, validateAddress } from './utils/address';
export { getChainMeta, getAllChainMeta, getExplorerTxUrl, getExplorerAddressUrl } from './utils/chains';
export type { ChainMeta } from './utils/chains';
export { persistSession, loadSession, clearSession } from './utils/storage';
