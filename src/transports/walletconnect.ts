/**
 * WalletConnect v2 transport layer for @goblink/connect.
 *
 * KEY INSIGHT: ReOwn AppKit already uses WalletConnect v2 internally for EVM + Solana.
 * On mobile, AppKit automatically handles deep links and WC flows for those chains.
 *
 * This module exists for chains NOT covered by AppKit:
 * - Sui (dapp-kit is injected-only by default)
 * - Future chains that need standalone WC sessions
 *
 * For EVM/Solana/Bitcoin: the existing adapters (via AppKit) already handle WC on mobile.
 * No additional work needed — AppKit detects mobile and uses WC deep links automatically.
 *
 * TODO: Install @walletconnect/sign-client as a dependency when ready to implement
 * standalone Sui WC sessions. For now, this module provides the type contract and
 * a placeholder implementation.
 */

import type { ChainType } from '../core/types';
import type { Transport } from '../core/detector';

/** WalletConnect session metadata */
export interface WCSession {
  topic: string;
  chain: ChainType;
  address: string;
  peerName: string;
  peerIcon: string | null;
  expiresAt: number;
}

/** WalletConnect transport configuration */
export interface WCTransportConfig {
  projectId: string;
  metadata?: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
}

/** Chain namespace mappings for WalletConnect v2 */
export const WC_CHAIN_NAMESPACES: Partial<Record<ChainType, string>> = {
  evm: 'eip155',
  solana: 'solana',
  sui: 'sui',      // Sui Wallet supports WC v2 via sui: namespace
  aptos: 'aptos',
  starknet: 'starknet',
};

/** CAIP-2 chain IDs for common networks */
export const WC_CHAIN_IDS: Partial<Record<ChainType, string>> = {
  evm: 'eip155:1',        // Ethereum mainnet
  solana: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',  // Solana mainnet
  sui: 'sui:mainnet',
  aptos: 'aptos:1',
  starknet: 'starknet:SN_MAIN',
};

/**
 * Checks which chains are handled by AppKit's built-in WC support.
 * These chains don't need a standalone WC session — AppKit does it.
 */
export function isAppKitWCChain(chain: ChainType): boolean {
  return chain === 'evm' || chain === 'solana' || chain === 'bitcoin';
}

/**
 * Checks if a chain needs a standalone WalletConnect session
 * (i.e., not covered by AppKit).
 */
export function needsStandaloneWC(chain: ChainType): boolean {
  return !isAppKitWCChain(chain) && chain !== 'ton' && chain !== 'tron';
}

/**
 * WalletConnect transport for non-AppKit chains.
 *
 * Currently a type-safe placeholder. When @walletconnect/sign-client is installed,
 * this will manage standalone WC v2 sessions for Sui, Aptos, Starknet, etc.
 *
 * For EVM/Solana/Bitcoin: use the existing AppKit adapters — they handle WC internally.
 */
export class WalletConnectTransport {
  private config: WCTransportConfig;
  private sessions: Map<ChainType, WCSession> = new Map();

  constructor(config: WCTransportConfig) {
    this.config = config;
  }

  /**
   * Initialize the WC SignClient.
   * TODO: Implement when @walletconnect/sign-client is added as a dependency.
   */
  async init(): Promise<void> {
    // TODO: Initialize SignClient with this.config.projectId
    console.warn(
      '[BlinkConnect] WalletConnect standalone transport not yet initialized. ' +
      'EVM/Solana/Bitcoin use AppKit\'s built-in WC support. ' +
      'Sui/Aptos/Starknet standalone WC sessions require @walletconnect/sign-client.'
    );
  }

  /**
   * Connect to a wallet via WalletConnect v2.
   * Returns the WC URI for deep linking on mobile.
   */
  async connect(chain: ChainType): Promise<{ uri: string; session: WCSession } | null> {
    if (isAppKitWCChain(chain)) {
      console.warn(
        `[BlinkConnect] ${chain} uses AppKit's built-in WC. Use the chain adapter directly.`
      );
      return null;
    }

    // TODO: Implement standalone WC session creation
    // 1. Create session proposal with required namespaces for the chain
    // 2. Get the WC URI from the proposal
    // 3. Return URI for deep linking + listen for approval
    console.warn(`[BlinkConnect] Standalone WC connect for ${chain} not yet implemented.`);
    return null;
  }

  /**
   * Disconnect a chain's WC session.
   */
  async disconnect(chain: ChainType): Promise<void> {
    this.sessions.delete(chain);
    // TODO: Call signClient.disconnect() with the session topic
  }

  /**
   * Get an active WC session for a chain.
   */
  getSession(chain: ChainType): WCSession | null {
    return this.sessions.get(chain) ?? null;
  }

  /**
   * Get all active WC sessions.
   */
  getAllSessions(): Map<ChainType, WCSession> {
    return new Map(this.sessions);
  }

  /**
   * Check if a chain has an active WC session.
   */
  hasSession(chain: ChainType): boolean {
    const session = this.sessions.get(chain);
    if (!session) return false;
    // Check expiry
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(chain);
      return false;
    }
    return true;
  }

  /**
   * Restore persisted WC sessions from localStorage.
   * TODO: Implement with SignClient.session.getAll()
   */
  async restoreSessions(): Promise<void> {
    // TODO: Iterate persisted sessions and validate they're still active
  }

  /**
   * Get the transport type for a given chain connection.
   */
  getTransportType(): Transport {
    return 'walletconnect';
  }
}
