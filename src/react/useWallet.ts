import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useBlinkWalletContext } from './BlinkConnectProvider';
import type { ChainType, ConnectedWallet } from '../core/types';
import { getPlatformInfo } from '../core/detector';
import type { PlatformInfo, Transport } from '../core/detector';
import { SessionManager } from '../core/session';
import type { LinkedSession, WalletEntry } from '../core/session';

export interface UseWalletReturn {
  /** All connected wallets */
  wallets: ConnectedWallet[];

  /** Primary wallet address (first connected) */
  address: string | null;

  /** Primary wallet chain */
  chain: ChainType | null;

  /** Whether any wallet is connected */
  isConnected: boolean;

  /** Number of connected wallets */
  connectedCount: number;

  /** Open the connect modal, optionally for a specific chain */
  connect: (chain?: ChainType) => Promise<void>;

  /** Disconnect a specific chain or all */
  disconnect: (chain?: ChainType) => Promise<void>;

  /** Get address for a specific chain */
  getAddress: (chain: ChainType) => string | null;

  /** Check if a specific chain is connected */
  isChainConnected: (chain: ChainType) => boolean;

  /** Switch primary chain (opens modal for that chain) */
  switchChain: (chain: ChainType) => Promise<void>;

  // ── v0.2.0 additions ──

  /** Platform detection info (desktop/mobile/wallet-browser) */
  platform: PlatformInfo;

  /** Primary wallet details (chain + address) */
  primaryWallet: { chain: ChainType; address: string } | null;

  /** All linked wallets (excludes primary) */
  linkedWallets: Array<{ chain: ChainType; address: string }>;

  /** Link an additional wallet by opening the modal for that chain */
  linkWallet: (chain: ChainType) => Promise<void>;

  /** Unlink a specific chain's wallet */
  unlinkWallet: (chain: ChainType) => void;

  /** Get the transport type used for a chain's connection */
  getTransport: (chain: ChainType) => Transport | null;

  /** Full linked session state */
  session: LinkedSession;
}

// Module-level session manager — shared across hook instances
let globalSessionManager: SessionManager | null = null;

function getSessionManager(): SessionManager {
  if (!globalSessionManager) {
    globalSessionManager = new SessionManager();
    // Try to restore a persisted session
    globalSessionManager.restore();
  }
  return globalSessionManager;
}

/**
 * Primary hook for wallet interaction.
 * v0.2.0 adds platform detection, session linking, and transport awareness.
 *
 * @example
 * ```tsx
 * const {
 *   wallets, address, isConnected, connect, disconnect,
 *   platform, primaryWallet, linkedWallets, linkWallet, getTransport,
 * } = useWallet();
 *
 * // Connect any chain
 * <button onClick={() => connect()}>Connect</button>
 *
 * // Link a specific chain
 * <button onClick={() => linkWallet('solana')}>Link Solana</button>
 *
 * // Check transport
 * const transport = getTransport('evm'); // 'injected' | 'walletconnect' | null
 * ```
 */
export function useWallet(): UseWalletReturn {
  const ctx = useBlinkWalletContext();
  const sessionManager = useMemo(() => getSessionManager(), []);
  const platform = useMemo(() => getPlatformInfo(), []);

  // Sync session manager with actual adapter states
  const prevWalletsRef = useRef<string>('');
  useEffect(() => {
    const key = ctx.connectedWallets.map((w) => `${w.chain}:${w.address}`).join(',');
    if (key === prevWalletsRef.current) return;
    prevWalletsRef.current = key;

    // Sync: add newly connected wallets, remove disconnected ones
    const currentChains = new Set(ctx.connectedWallets.map((w) => w.chain));
    const sessionChains = new Set(sessionManager.getAllWallets().map((w) => w.chain));

    // Add new connections
    for (const wallet of ctx.connectedWallets) {
      if (!sessionManager.hasChain(wallet.chain)) {
        const transport = ctx.adapters[wallet.chain]?.transport ?? 'injected';
        if (sessionManager.count === 0) {
          sessionManager.setPrimary(wallet.chain, wallet.address, transport);
        } else {
          sessionManager.linkWallet(wallet.chain, wallet.address, transport);
        }
      }
    }

    // Remove disconnected
    for (const chain of sessionChains) {
      if (!currentChains.has(chain)) {
        sessionManager.unlinkWallet(chain);
      }
    }

    // Persist
    sessionManager.persist();
  }, [ctx.connectedWallets, ctx.adapters, sessionManager]);

  const switchChain = useCallback(
    async (chain: ChainType) => {
      if (!ctx.isChainConnected(chain)) {
        await ctx.connect(chain);
      }
    },
    [ctx]
  );

  const linkWallet = useCallback(
    async (chain: ChainType) => {
      if (ctx.isChainConnected(chain)) {
        // Already connected — just make sure it's in the session
        const addr = ctx.getAddressForChain(chain);
        if (addr) {
          const transport = ctx.adapters[chain]?.transport ?? 'injected';
          sessionManager.linkWallet(chain, addr, transport);
          sessionManager.persist();
        }
        return;
      }
      // Open modal/connect for this chain
      await ctx.connect(chain);
    },
    [ctx, sessionManager]
  );

  const unlinkWallet = useCallback(
    (chain: ChainType) => {
      sessionManager.unlinkWallet(chain);
      sessionManager.persist();
      // Also disconnect the adapter
      ctx.disconnect(chain);
    },
    [ctx, sessionManager]
  );

  const getTransport = useCallback(
    (chain: ChainType): Transport | null => {
      return ctx.adapters[chain]?.transport ?? sessionManager.getTransport(chain);
    },
    [ctx.adapters, sessionManager]
  );

  const session = useMemo(() => sessionManager.getSession(), [
    sessionManager,
    // Re-derive when wallets change
    ctx.connectedWallets,
  ]);

  const primaryWallet = useMemo(() => {
    if (session.primary) {
      return { chain: session.primary.chain, address: session.primary.address };
    }
    // Fallback to first connected
    const first = ctx.connectedWallets[0];
    return first ? { chain: first.chain, address: first.address } : null;
  }, [session, ctx.connectedWallets]);

  const linkedWallets = useMemo(() => {
    return session.linked.map((w) => ({ chain: w.chain, address: w.address }));
  }, [session]);

  return {
    // v0.1 API (unchanged)
    wallets: ctx.connectedWallets,
    address: ctx.address,
    chain: ctx.chain,
    isConnected: ctx.isConnected,
    connectedCount: ctx.connectedWallets.length,
    connect: ctx.connect,
    disconnect: ctx.disconnect,
    getAddress: ctx.getAddressForChain,
    isChainConnected: ctx.isChainConnected,
    switchChain,

    // v0.2.0 additions
    platform,
    primaryWallet,
    linkedWallets,
    linkWallet,
    unlinkWallet,
    getTransport,
    session,
  };
}
