export { BlinkConnectProvider, useBlinkWalletContext } from './BlinkConnectProvider';
export type { BlinkConnectProviderProps, BlinkWalletContextType } from './BlinkConnectProvider';

export { useWallet } from './useWallet';
export type { UseWalletReturn } from './useWallet';

export { useConnect } from './useConnect';
export type { UseConnectReturn } from './useConnect';

export { useBalance } from './useBalance';
export type { BalanceResult } from './useBalance';

export { useSign } from './useSign';
export type { UseSignReturn } from './useSign';

export { ConnectModal } from './ConnectModal';
export type { ConnectModalProps } from './ConnectModal';

export { ConnectButton } from './ConnectButton';
export type { ConnectButtonProps } from './ConnectButton';

// Re-export v0.2.0 types from core for convenience
export type { PlatformInfo, Platform, Transport } from '../core/detector';
export type { LinkedSession, WalletEntry } from '../core/session';
