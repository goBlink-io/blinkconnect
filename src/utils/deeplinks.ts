import type { ChainType } from '../core/types';

/** Information about a mobile wallet app */
export interface MobileWalletInfo {
  id: string;
  name: string;
  icon: string;
  chains: ChainType[];
  deepLink: (uri: string) => string;
  universalLink?: string;
  /** App Store / Play Store URLs for install prompts */
  appStore?: string;
  playStore?: string;
}

/**
 * Mobile wallet deep link generators.
 * These open the native wallet app with a WalletConnect URI.
 *
 * On mobile: tap wallet button → generates WC URI → opens deep link → wallet opens → approve → return.
 * On desktop: not used (injected providers handle it).
 */
const DEEP_LINK_GENERATORS: Record<string, (uri: string) => string> = {
  metamask: (uri) => `metamask://wc?uri=${encodeURIComponent(uri)}`,
  phantom: (uri) => `phantom://browse/${encodeURIComponent(uri)}`,
  'trust-wallet': (uri) => `trust://wc?uri=${encodeURIComponent(uri)}`,
  'coinbase-wallet': (uri) => `cbwallet://wc?uri=${encodeURIComponent(uri)}`,
  'sui-wallet': (uri) => `suiwallet://wc?uri=${encodeURIComponent(uri)}`,
  argent: (uri) => `argent://app/wc?uri=${encodeURIComponent(uri)}`,
  rainbow: (uri) => `rainbow://wc?uri=${encodeURIComponent(uri)}`,
  tonkeeper: (uri) => `tonkeeper://wc?uri=${encodeURIComponent(uri)}`,
};

/**
 * Get a deep link URL to open a wallet app with a WalletConnect URI.
 *
 * @param wallet - Wallet identifier (e.g., 'metamask', 'phantom')
 * @param uri - WalletConnect v2 URI
 * @returns Deep link URL string, or null if wallet is not supported
 */
export function getWalletDeepLink(wallet: string, uri: string): string | null {
  const generator = DEEP_LINK_GENERATORS[wallet.toLowerCase()];
  return generator?.(uri) ?? null;
}

/**
 * Supported mobile wallets with their metadata.
 * Used by the mobile connect modal to render wallet options.
 */
export const SUPPORTED_MOBILE_WALLETS: MobileWalletInfo[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    chains: ['evm'],
    deepLink: DEEP_LINK_GENERATORS.metamask!,
    appStore: 'https://apps.apple.com/app/metamask/id1438144202',
    playStore: 'https://play.google.com/store/apps/details?id=io.metamask',
  },
  {
    id: 'phantom',
    name: 'Phantom',
    icon: '👻',
    chains: ['solana', 'evm', 'bitcoin'],
    deepLink: DEEP_LINK_GENERATORS.phantom!,
    appStore: 'https://apps.apple.com/app/phantom-crypto-wallet/id1598432977',
    playStore: 'https://play.google.com/store/apps/details?id=app.phantom',
  },
  {
    id: 'trust-wallet',
    name: 'Trust Wallet',
    icon: '🛡️',
    chains: ['evm', 'solana'],
    deepLink: DEEP_LINK_GENERATORS['trust-wallet']!,
    appStore: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
    playStore: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
  },
  {
    id: 'coinbase-wallet',
    name: 'Coinbase Wallet',
    icon: '🔵',
    chains: ['evm', 'solana'],
    deepLink: DEEP_LINK_GENERATORS['coinbase-wallet']!,
    appStore: 'https://apps.apple.com/app/coinbase-wallet/id1278383455',
    playStore: 'https://play.google.com/store/apps/details?id=org.toshi',
  },
  {
    id: 'sui-wallet',
    name: 'Sui Wallet',
    icon: '💧',
    chains: ['sui'],
    deepLink: DEEP_LINK_GENERATORS['sui-wallet']!,
    appStore: 'https://apps.apple.com/app/sui-wallet-mobile/id6476572140',
    playStore: 'https://play.google.com/store/apps/details?id=com.mystenlabs.suiwallet',
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    icon: '🌈',
    chains: ['evm'],
    deepLink: DEEP_LINK_GENERATORS.rainbow!,
    appStore: 'https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021',
    playStore: 'https://play.google.com/store/apps/details?id=me.rainbow',
  },
];

/**
 * Get wallets that support a specific chain.
 */
export function getWalletsForChain(chain: ChainType): MobileWalletInfo[] {
  return SUPPORTED_MOBILE_WALLETS.filter((w) => w.chains.includes(chain));
}
