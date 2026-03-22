import type { ChainType } from './types';

export type Platform = 'desktop-browser' | 'mobile-browser' | 'wallet-browser';
export type Transport = 'injected' | 'walletconnect' | 'zklogin' | 'tonconnect';

export interface PlatformInfo {
  platform: Platform;
  isMobile: boolean;
  isWalletBrowser: boolean;
  walletBrowser: 'metamask' | 'phantom' | 'sui-wallet' | 'trust' | 'coinbase' | null;
  injectedProviders: ChainType[];
  recommendedTransport: Partial<Record<ChainType, Transport>>;
}

/**
 * Detect the current platform environment and recommend connection transports.
 *
 * - Desktop with extensions → injected for all chains
 * - Mobile wallet browser (MetaMask, Phantom, etc.) → injected for that chain, walletconnect for others
 * - Mobile regular browser (Safari, Chrome) → walletconnect for all (tonconnect for TON)
 */
export function detectPlatform(): PlatformInfo {
  // SSR guard
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      platform: 'desktop-browser',
      isMobile: false,
      isWalletBrowser: false,
      walletBrowser: null,
      injectedProviders: [],
      recommendedTransport: {},
    };
  }

  const ua = navigator.userAgent;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);

  // Detect injected providers
  const injectedProviders: ChainType[] = [];
  const win = window as unknown as Record<string, unknown>;

  const hasEthereum = !!win.ethereum;
  const hasPhantomSolana = !!(win.phantom as Record<string, unknown>)?.solana;
  const hasSuiWallet = !!win.suiWallet;
  const hasTronLink = !!win.tronLink || !!win.tronWeb;

  if (hasEthereum) injectedProviders.push('evm');
  if (hasPhantomSolana || (hasEthereum && (win.ethereum as Record<string, unknown>)?.isPhantom))
    injectedProviders.push('solana');
  if (hasSuiWallet) injectedProviders.push('sui');
  if (hasTronLink) injectedProviders.push('tron');

  // Detect wallet browser
  let walletBrowser: PlatformInfo['walletBrowser'] = null;
  if (hasEthereum) {
    const eth = win.ethereum as Record<string, unknown>;
    if (eth.isMetaMask && !eth.isBraveWallet) walletBrowser = 'metamask';
    else if (eth.isTrust || eth.isTrustWallet) walletBrowser = 'trust';
    else if (eth.isCoinbaseWallet || eth.isCoinbaseBrowser) walletBrowser = 'coinbase';
  }
  if (!walletBrowser && hasPhantomSolana) {
    walletBrowser = 'phantom';
  }
  if (!walletBrowser && hasSuiWallet) {
    walletBrowser = 'sui-wallet';
  }

  const isWalletBrowser = isMobile && walletBrowser !== null;

  // Determine platform
  let platform: Platform;
  if (isWalletBrowser) {
    platform = 'wallet-browser';
  } else if (isMobile) {
    platform = 'mobile-browser';
  } else {
    platform = 'desktop-browser';
  }

  // Build recommended transports
  const recommendedTransport: Partial<Record<ChainType, Transport>> = {};
  const allChains: ChainType[] = ['evm', 'solana', 'bitcoin', 'sui', 'near', 'aptos', 'starknet', 'ton', 'tron'];

  for (const chain of allChains) {
    if (chain === 'ton') {
      // TON always uses TonConnect regardless of platform
      recommendedTransport[chain] = 'tonconnect';
      continue;
    }

    if (platform === 'desktop-browser') {
      // Desktop: use injected for all (current behavior)
      recommendedTransport[chain] = 'injected';
    } else if (platform === 'wallet-browser') {
      // Wallet browser: injected for chains the wallet supports, WC for others
      if (injectedProviders.includes(chain)) {
        recommendedTransport[chain] = 'injected';
      } else {
        recommendedTransport[chain] = 'walletconnect';
      }
    } else {
      // Mobile browser: WC for everything (no injected providers available)
      recommendedTransport[chain] = 'walletconnect';
    }
  }

  return {
    platform,
    isMobile,
    isWalletBrowser,
    walletBrowser,
    injectedProviders,
    recommendedTransport,
  };
}

/**
 * React-friendly cached platform detection.
 * Evaluates once and memoizes — platform doesn't change during a session.
 */
let cachedPlatformInfo: PlatformInfo | null = null;

export function getPlatformInfo(): PlatformInfo {
  if (!cachedPlatformInfo) {
    cachedPlatformInfo = detectPlatform();
  }
  return cachedPlatformInfo;
}

/**
 * Reset cached platform info (useful for testing).
 */
export function resetPlatformCache(): void {
  cachedPlatformInfo = null;
}
