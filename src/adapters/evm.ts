import { useCallback } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import {
  useAppKitAccount,
  useDisconnect as useAppKitDisconnect,
  useAppKit,
} from '@reown/appkit/react';
import type { AdapterHookResult, ChainType } from '../core/types';
import { getPlatformInfo } from '../core/detector';

interface EvmAdapterResult {
  evm: AdapterHookResult;
  solana: AdapterHookResult;
  bitcoin: AdapterHookResult;
}

/**
 * EVM adapter — uses ReOwn AppKit which handles EVM + Solana + Bitcoin.
 * Returns adapter results for all three chains since they share one connection layer.
 */
export function useEvmAdapter(): EvmAdapterResult {
  const { address: appKitAddress, isConnected: appKitConnected, caipAddress } = useAppKitAccount();
  const { disconnect: appKitDisconnect } = useAppKitDisconnect();
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { open: openAppKit } = useAppKit();

  // Determine which chain AppKit is connected to via CAIP address
  const appKitChain = (() => {
    if (!caipAddress) return null;
    if (caipAddress.startsWith('eip155:')) return 'evm' as ChainType;
    if (caipAddress.startsWith('solana:')) return 'solana' as ChainType;
    if (caipAddress.startsWith('bip122:')) return 'bitcoin' as ChainType;
    return null;
  })();

  const evmAddress =
    (appKitChain === 'evm' && appKitAddress) || (wagmiConnected && wagmiAddress) || null;
  const solanaAddress = (appKitChain === 'solana' && appKitAddress) || null;
  const bitcoinAddress = (appKitChain === 'bitcoin' && appKitAddress) || null;

  const connect = useCallback(async () => {
    openAppKit();
  }, [openAppKit]);

  const disconnect = useCallback(async () => {
    if (appKitConnected) await appKitDisconnect();
    if (wagmiConnected) wagmiDisconnect();
  }, [appKitConnected, appKitDisconnect, wagmiConnected, wagmiDisconnect]);

  // AppKit handles WC internally on mobile — detect the transport used
  const platformInfo = getPlatformInfo();
  const getEvmTransport = (chain: ChainType, isConnected: boolean) => {
    if (!isConnected) return null;
    // AppKit uses WC on mobile browsers, injected on desktop
    return platformInfo.recommendedTransport[chain] ?? 'injected';
  };

  return {
    evm: {
      chain: 'evm',
      address: evmAddress,
      connected: !!evmAddress,
      transport: getEvmTransport('evm', !!evmAddress),
      connect,
      disconnect,
    },
    solana: {
      chain: 'solana',
      address: solanaAddress,
      connected: !!solanaAddress,
      transport: getEvmTransport('solana', !!solanaAddress),
      connect,
      disconnect,
    },
    bitcoin: {
      chain: 'bitcoin',
      address: bitcoinAddress,
      connected: !!bitcoinAddress,
      transport: getEvmTransport('bitcoin', !!bitcoinAddress),
      connect,
      disconnect,
    },
  };
}
