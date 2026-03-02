import React, { useState, useEffect, useRef } from 'react';
import { useBlinkWalletContext } from './BlinkConnectProvider';
import type { ChainType } from '../core/types';
import { formatAddress } from '../utils/address';
import { getChainMeta } from '../utils/chains';

// Sui wallet connection
import {
  useWallets as useSuiWallets,
  useConnectWallet as useSuiConnectWallet,
} from '@mysten/dapp-kit';

// Starknet connectors for the modal
let useStarknetConnectHook: (() => { connect: any; connectors: any[] }) | null = null;
try {
  const starknet = require('@starknet-react/core');
  useStarknetConnectHook = starknet.useConnect;
} catch {}

export interface ConnectModalProps {
  /** Limit which chains are shown */
  chains?: ChainType[];
  /** Theme override */
  theme?: 'light' | 'dark';
  /** Accent color (CSS color) */
  accentColor?: string;
  /** App logo URL */
  logo?: string;
  /** Custom CSS class */
  className?: string;
}

interface ChainOption {
  id: ChainType;
  name: string;
  description: string;
  gradient: string;
}

const ALL_CHAINS: ChainOption[] = [
  { id: 'evm', name: 'EVM Chains', description: 'Ethereum, Base, Arbitrum, BNB +10 more', gradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' },
  { id: 'solana', name: 'Solana', description: 'Fast & low-cost transactions', gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)' },
  { id: 'bitcoin', name: 'Bitcoin', description: 'Digital gold standard', gradient: 'linear-gradient(135deg, #f97316, #eab308)' },
  { id: 'sui', name: 'Sui', description: 'Next-gen Move blockchain', gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)' },
  { id: 'near', name: 'NEAR', description: 'Simple, secure & scalable', gradient: 'linear-gradient(135deg, #22c55e, #14b8a6)' },
  { id: 'aptos', name: 'Aptos', description: 'Safe & scalable Layer 1', gradient: 'linear-gradient(135deg, #14b8a6, #22c55e)' },
  { id: 'starknet', name: 'Starknet', description: 'ZK-rollup on Ethereum', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
  { id: 'ton', name: 'TON', description: 'The Open Network', gradient: 'linear-gradient(135deg, #0ea5e9, #3b82f6)' },
  { id: 'tron', name: 'Tron', description: 'Decentralized internet', gradient: 'linear-gradient(135deg, #ef4444, #f43f5e)' },
];

/**
 * Pre-built connect wallet modal. Renders a chain selector grid,
 * then wallet-specific connection flow per chain.
 *
 * @example
 * ```tsx
 * // Include in your app (renders when modal is open)
 * <ConnectModal theme="dark" />
 *
 * // Limit to specific chains
 * <ConnectModal chains={['evm', 'solana', 'sui']} />
 * ```
 */
export function ConnectModal({ chains, theme, accentColor, logo, className }: ConnectModalProps) {
  const ctx = useBlinkWalletContext();
  const resolvedTheme = theme || ctx.config.theme || 'dark';
  const isDark = resolvedTheme === 'dark';

  const [selectedChain, setSelectedChain] = useState<ChainType | null>(null);
  const previousSuiRef = useRef(ctx.isChainConnected('sui'));

  // Filter chains based on props and config
  const visibleChains = ALL_CHAINS.filter((c) => {
    if (chains && !chains.includes(c.id)) return false;
    if (ctx.config.chains && !ctx.config.chains.includes(c.id)) return false;
    return true;
  });

  // Auto-close on Sui connect
  useEffect(() => {
    const nowConnected = ctx.isChainConnected('sui');
    if (!previousSuiRef.current && nowConnected && selectedChain === 'sui') {
      setTimeout(() => {
        ctx.closeModal();
        setSelectedChain(null);
      }, 400);
    }
    previousSuiRef.current = nowConnected;
  }, [ctx.isChainConnected('sui'), selectedChain]);

  // Reset selection when modal closes
  useEffect(() => {
    if (!ctx.isModalOpen) setSelectedChain(null);
  }, [ctx.isModalOpen]);

  if (!ctx.isModalOpen) return null;

  const handleConnect = async (chain: ChainType) => {
    try {
      await ctx.connect(chain);
      if (chain !== 'sui') ctx.closeModal();
    } catch (e) {
      console.error(`[BlinkConnect] Failed to connect ${chain}:`, e);
    }
  };

  const handleBack = () => setSelectedChain(null);

  // ── Styles ──
  const colors = {
    bg: isDark ? '#09090b' : '#ffffff',
    bgSecondary: isDark ? '#18181b' : '#f4f4f5',
    border: isDark ? '#27272a' : '#e4e4e7',
    text: isDark ? '#fafafa' : '#09090b',
    textSecondary: isDark ? '#a1a1aa' : '#71717a',
    textMuted: isDark ? '#71717a' : '#a1a1aa',
    accent: accentColor || '#3b82f6',
    connectedBg: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)',
    connectedBorder: isDark ? '#166534' : '#bbf7d0',
    connectedText: isDark ? '#4ade80' : '#16a34a',
    dangerBg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
    dangerText: isDark ? '#f87171' : '#dc2626',
    hoverBg: isDark ? '#27272a' : '#f4f4f5',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  };

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
  };

  const modalStyle: React.CSSProperties = {
    position: 'relative',
    backgroundColor: colors.bg,
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    maxWidth: '420px',
    width: '100%',
    padding: '24px',
    maxHeight: '90vh',
    overflowY: 'auto',
    border: `1px solid ${colors.border}`,
  };

  const renderChainList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {visibleChains.map((chain) => {
        const connected = ctx.isChainConnected(chain.id);
        const addr = ctx.getAddressForChain(chain.id);
        const meta = getChainMeta(chain.id);

        return (
          <div
            key={chain.id}
            onClick={connected ? undefined : () => setSelectedChain(chain.id)}
            role={connected ? undefined : 'button'}
            style={{
              padding: '14px',
              borderRadius: '12px',
              border: `2px solid ${connected ? colors.connectedBorder : colors.border}`,
              backgroundColor: connected ? colors.connectedBg : 'transparent',
              cursor: connected ? 'default' : 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            onMouseEnter={(e) => {
              if (!connected) {
                e.currentTarget.style.backgroundColor = colors.hoverBg;
                e.currentTarget.style.borderColor = isDark ? '#3f3f46' : '#d4d4d8';
              }
            }}
            onMouseLeave={(e) => {
              if (!connected) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = colors.border;
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: chain.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '14px',
                  flexShrink: 0,
                }}
              >
                {meta?.symbol?.[0] || chain.name[0]}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: colors.text }}>
                  {chain.name}
                </div>
                <div style={{ fontSize: '12px', color: connected ? colors.connectedText : colors.textSecondary }}>
                  {connected && addr ? formatAddress(addr) : chain.description}
                </div>
              </div>
            </div>
            {connected ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.disconnect(chain.id);
                }}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  borderRadius: '8px',
                  backgroundColor: colors.dangerBg,
                  color: colors.dangerText,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Disconnect
              </button>
            ) : (
              <span style={{ color: colors.textMuted, fontSize: '14px' }}>&rarr;</span>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderChainConnect = () => {
    if (!selectedChain) return null;
    const chain = ALL_CHAINS.find((c) => c.id === selectedChain)!;

    if (selectedChain === 'sui') {
      return <SuiConnectView colors={colors} onClose={ctx.closeModal} />;
    }

    if (selectedChain === 'starknet' && useStarknetConnectHook) {
      return <StarknetConnectView colors={colors} onClose={ctx.closeModal} />;
    }

    return (
      <div>
        <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '16px' }}>
          {chain.description}
        </p>
        <button
          onClick={() => handleConnect(selectedChain)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: colors.accent,
            color: 'white',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Connect Wallet
        </button>
        {(selectedChain === 'evm' || selectedChain === 'solana' || selectedChain === 'bitcoin') && (
          <p style={{ fontSize: '12px', color: colors.textMuted, textAlign: 'center', marginTop: '12px' }}>
            Powered by ReOwn AppKit — 350+ wallets
          </p>
        )}
      </div>
    );
  };

  return (
    <div style={overlayStyle} className={className}>
      <div style={backdropStyle} onClick={ctx.closeModal} />
      <div style={modalStyle}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            {logo && (
              <img
                src={logo}
                alt=""
                style={{ width: '24px', height: '24px', borderRadius: '6px', marginBottom: '4px' }}
              />
            )}
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: colors.text, margin: 0 }}>
              {selectedChain ? 'Connect Wallet' : 'Select Chain'}
            </h2>
            <p style={{ fontSize: '14px', color: colors.textSecondary, margin: '2px 0 0 0' }}>
              {selectedChain
                ? ALL_CHAINS.find((c) => c.id === selectedChain)?.description
                : 'Choose a blockchain to connect'}
            </p>
          </div>
          <button
            onClick={selectedChain ? handleBack : ctx.closeModal}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: colors.textSecondary,
              fontSize: '18px',
            }}
          >
            {selectedChain ? '\u2190' : '\u2715'}
          </button>
        </div>

        {/* Content */}
        {!selectedChain ? renderChainList() : renderChainConnect()}

        {/* Footer */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '12px',
            borderTop: `1px solid ${colors.border}`,
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>
            Connect multiple chains — they all stay connected simultaneously
          </p>
        </div>
      </div>
    </div>
  );
}

// Starknet sub-view (needs its own hook context)
function SuiConnectView({ colors, onClose }: { colors: any; onClose: () => void }) {
  const wallets = useSuiWallets();
  const { mutate: connectWallet } = useSuiConnectWallet();

  const handleConnect = (wallet: any) => {
    connectWallet(
      { wallet },
      {
        onSuccess: () => {
          setTimeout(onClose, 400);
        },
      }
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px' }}>
        Select a Sui wallet
      </p>
      {wallets.length === 0 && (
        <p style={{ fontSize: '13px', color: colors.textMuted, textAlign: 'center', padding: '20px 0' }}>
          No Sui wallets detected. Install a Sui wallet extension.
        </p>
      )}
      {wallets.map((wallet) => (
        <button
          key={wallet.name}
          onClick={() => handleConnect(wallet)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '10px',
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.cardBg,
            color: colors.text,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: 'inherit',
            transition: 'background-color 0.15s',
            width: '100%',
          }}
        >
          {wallet.icon && (
            <img
              src={wallet.icon}
              alt={wallet.name}
              style={{ width: '28px', height: '28px', borderRadius: '6px' }}
            />
          )}
          <span>{wallet.name}</span>
        </button>
      ))}
    </div>
  );
}

function StarknetConnectView({ colors, onClose }: { colors: any; onClose: () => void }) {
  if (!useStarknetConnectHook) return null;
  const { connect, connectors } = useStarknetConnectHook();

  const walletNames = ['Argent X', 'Braavos'];
  const walletEmojis = ['\uD83E\uDD8A', '\uD83D\uDEE1\uFE0F'];

  return (
    <div>
      <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '12px' }}>
        Connect your Starknet wallet
      </p>
      {connectors.map((connector: any, i: number) => (
        <button
          key={i}
          onClick={() => {
            connect({ connector });
            onClose();
          }}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '12px',
            border: `2px solid ${colors.border}`,
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.hoverBg;
            e.currentTarget.style.borderColor = colors.accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = colors.border;
          }}
        >
          <span style={{ fontSize: '20px' }}>{walletEmojis[i] || '\uD83D\uDCB3'}</span>
          <span style={{ fontWeight: 600, color: colors.text }}>
            {walletNames[i] || `Wallet ${i + 1}`}
          </span>
        </button>
      ))}
    </div>
  );
}
