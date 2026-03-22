import type { ChainType } from './types';
import type { Transport } from './detector';

const STORAGE_KEY = 'blinkconnect:session';

/** A single wallet entry in a linked session */
export interface WalletEntry {
  chain: ChainType;
  address: string;
  transport: Transport;
}

/** Linked session tracking multiple connected wallets */
export interface LinkedSession {
  id: string;
  primary: WalletEntry | null;
  linked: WalletEntry[];
  createdAt: number;
}

/**
 * Generate a simple unique ID (no crypto dependency needed).
 */
function generateId(): string {
  return `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * SessionManager tracks multiple connected wallets across chains.
 *
 * - One primary wallet (first connected)
 * - Additional linked wallets for cross-chain operations
 * - Persists to localStorage for session continuity
 * - Framework-agnostic (used by both React hooks and vanilla client)
 */
export class SessionManager {
  private session: LinkedSession;

  constructor() {
    this.session = this.createEmptySession();
  }

  private createEmptySession(): LinkedSession {
    return {
      id: generateId(),
      primary: null,
      linked: [],
      createdAt: Date.now(),
    };
  }

  /** Get the current session state */
  getSession(): LinkedSession {
    return { ...this.session };
  }

  /** Set the primary wallet (first connected wallet) */
  setPrimary(chain: ChainType, address: string, transport: Transport): void {
    // If there's already a primary and it's a different chain, move it to linked
    if (this.session.primary && this.session.primary.chain !== chain) {
      // Don't duplicate — check if it's already linked
      if (!this.session.linked.some((w) => w.chain === this.session.primary!.chain)) {
        this.session.linked.push({ ...this.session.primary });
      }
    }

    // Remove from linked if this chain was already linked
    this.session.linked = this.session.linked.filter((w) => w.chain !== chain);

    this.session.primary = { chain, address, transport };
  }

  /** Link an additional wallet (for cross-chain operations) */
  linkWallet(chain: ChainType, address: string, transport: Transport): void {
    // If no primary yet, this becomes the primary
    if (!this.session.primary) {
      this.setPrimary(chain, address, transport);
      return;
    }

    // If same chain as primary, update primary
    if (this.session.primary.chain === chain) {
      this.session.primary = { chain, address, transport };
      return;
    }

    // Remove existing entry for this chain, then add
    this.session.linked = this.session.linked.filter((w) => w.chain !== chain);
    this.session.linked.push({ chain, address, transport });
  }

  /** Unlink a wallet by chain */
  unlinkWallet(chain: ChainType): void {
    // If unlinking primary, promote first linked wallet
    if (this.session.primary?.chain === chain) {
      if (this.session.linked.length > 0) {
        this.session.primary = this.session.linked.shift()!;
      } else {
        this.session.primary = null;
      }
      return;
    }

    this.session.linked = this.session.linked.filter((w) => w.chain !== chain);
  }

  /** Get the address for a specific chain */
  getAddress(chain: ChainType): string | null {
    if (this.session.primary?.chain === chain) return this.session.primary.address;
    return this.session.linked.find((w) => w.chain === chain)?.address ?? null;
  }

  /** Get the transport for a specific chain */
  getTransport(chain: ChainType): Transport | null {
    if (this.session.primary?.chain === chain) return this.session.primary.transport;
    return this.session.linked.find((w) => w.chain === chain)?.transport ?? null;
  }

  /** Check if a chain has a connected wallet in the session */
  hasChain(chain: ChainType): boolean {
    if (this.session.primary?.chain === chain) return true;
    return this.session.linked.some((w) => w.chain === chain);
  }

  /** Get all addresses across all connected wallets */
  getAllAddresses(): Array<{ chain: ChainType; address: string }> {
    const result: Array<{ chain: ChainType; address: string }> = [];
    if (this.session.primary) {
      result.push({ chain: this.session.primary.chain, address: this.session.primary.address });
    }
    for (const w of this.session.linked) {
      result.push({ chain: w.chain, address: w.address });
    }
    return result;
  }

  /** Get all wallet entries (primary + linked) */
  getAllWallets(): WalletEntry[] {
    const wallets: WalletEntry[] = [];
    if (this.session.primary) wallets.push({ ...this.session.primary });
    for (const w of this.session.linked) wallets.push({ ...w });
    return wallets;
  }

  /** Total number of connected wallets */
  get count(): number {
    return (this.session.primary ? 1 : 0) + this.session.linked.length;
  }

  /** Persist session to localStorage */
  persist(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.session));
    } catch {
      // localStorage full or unavailable — silent fail
    }
  }

  /** Restore session from localStorage */
  restore(): LinkedSession | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LinkedSession;
      // Validate structure
      if (!parsed.id || typeof parsed.createdAt !== 'number') return null;
      this.session = parsed;
      return this.getSession();
    } catch {
      return null;
    }
  }

  /** Clear the session (disconnect all) */
  clear(): void {
    this.session = this.createEmptySession();
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // silent
      }
    }
  }
}
