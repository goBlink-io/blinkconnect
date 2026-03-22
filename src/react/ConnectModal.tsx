import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useBlinkWalletContext } from './BlinkConnectProvider';
import type { ChainType } from '../core/types';
import { formatAddress } from '../utils/address';
import { getChainMeta } from '../utils/chains';
import { getPlatformInfo } from '../core/detector';
import type { PlatformInfo } from '../core/detector';
import { SUPPORTED_MOBILE_WALLETS, getWalletsForChain } from '../utils/deeplinks';
import type { MobileWalletInfo } from '../utils/deeplinks';

// Sui wallet connection
import {
  useWallets as useSuiWallets,
  useConnectWallet as useSuiConnectWallet,
} from '@mysten/dapp-kit';

// Starknet connectors for the modal
import { useConnect as useStarknetConnect } from '@starknet-react/core';

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

// ── Color helper ──
function getColors(isDark: boolean, accentColor?: string) {
  return {
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
}

type Colors = ReturnType<typeof getColors>;

/**
 * Pre-built connect wallet modal. Renders platform-aware UI:
 * - Desktop: chain selector grid → wallet-specific connection (unchanged from v0.1)
 * - Mobile browser: wallet app deep links → link another wallet
 * - Wallet browser: prominent injected wallet → link others via WC
 *
 * @example
 * ```tsx
 * <ConnectModal theme="dark" />
 * <ConnectModal chains={['evm', 'solana', 'sui']} />
 * ```
 */
export function ConnectModal({ chains, theme, accentColor, logo, className }: ConnectModalProps) {
  const ctx = useBlinkWalletContext();
  const resolvedTheme = theme || ctx.config.theme || 'dark';
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark, accentColor);

  const [selectedChain, setSelectedChain] = useState<ChainType | null>(null);
  const previousSuiRef = useRef(ctx.isChainConnected('sui'));

  const platformInfo = useMemo(() => getPlatformInfo(), []);

  // Filter chains based on props and config
  const visibleChains = ALL_CHAINS.filter((c) => {
    if (chains && !chains.includes(c.id)) return false;
    if (ctx.config.chains && !ctx.config.chains.includes(c.id)) return false;
    return true;
  });

  // Auto-close on Sui connect
  const suiConnected = ctx.isChainConnected('sui');
  useEffect(() => {
    if (!previousSuiRef.current && suiConnected && selectedChain === 'sui') {
      setTimeout(() => {
        ctx.closeModal();
        setSelectedChain(null);
      }, 400);
    }
    previousSuiRef.current = suiConnected;
  }, [suiConnected, selectedChain, ctx]);

  // Reset selection when modal closes
  useEffect(() => {
    if (!ctx.isModalOpen) setSelectedChain(null);
  }, [ctx.isModalOpen]);

  if (!ctx.isModalOpen) return null;

  const handleConnect = async (chain: ChainType) => {
    try {
      if (chain === 'evm' || chain === 'solana' || chain === 'bitcoin') {
        ctx.closeModal();
        await ctx.connect(chain);
        return;
      }
      await ctx.connect(chain);
    } catch (e) {
      console.error(`[BlinkConnect] Failed to connect ${chain}:`, e);
    }
  };

  const handleBack = () => setSelectedChain(null);

  // ── Styles ──
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

  // Determine which view to render
  const renderContent = () => {
    if (selectedChain) {
      return renderChainConnect(selectedChain, handleConnect, handleBack, colors, ctx);
    }

    switch (platformInfo.platform) {
      case 'mobile-browser':
        return (
          <MobileBrowserView
            visibleChains={visibleChains}
            colors={colors}
            ctx={ctx}
            platformInfo={platformInfo}
            onSelectChain={setSelectedChain}
            onConnect={handleConnect}
          />
        );
      case 'wallet-browser':
        return (
          <WalletBrowserView
            visibleChains={visibleChains}
            colors={colors}
            ctx={ctx}
            platformInfo={platformInfo}
            onSelectChain={setSelectedChain}
            onConnect={handleConnect}
          />
        );
      default:
        // Desktop: unchanged from v0.1
        return (
          <DesktopChainList
            visibleChains={visibleChains}
            colors={colors}
            isDark={isDark}
            ctx={ctx}
            onSelectChain={setSelectedChain}
          />
        );
    }
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
              {getHeaderTitle(selectedChain, platformInfo, ctx.connectedWallets.length > 0)}
            </h2>
            <p style={{ fontSize: '14px', color: colors.textSecondary, margin: '2px 0 0 0' }}>
              {getHeaderSubtitle(selectedChain, platformInfo, ctx.connectedWallets.length > 0)}
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
        {renderContent()}

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
            {platformInfo.isMobile
              ? 'Tap a wallet to open the app and approve the connection'
              : 'Connect multiple chains — they all stay connected simultaneously'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Header helpers ──

function getHeaderTitle(
  selectedChain: ChainType | null,
  platform: PlatformInfo,
  hasConnected: boolean
): string {
  if (selectedChain) return 'Connect Wallet';
  if (platform.platform === 'mobile-browser' && hasConnected) return 'Link Another Wallet';
  if (platform.platform === 'wallet-browser') return 'Connect Wallet';
  return 'Select Chain';
}

function getHeaderSubtitle(
  selectedChain: ChainType | null,
  platform: PlatformInfo,
  hasConnected: boolean
): string {
  if (selectedChain) {
    return ALL_CHAINS.find((c) => c.id === selectedChain)?.description ?? '';
  }
  if (platform.platform === 'mobile-browser' && !hasConnected) {
    return 'Choose a wallet app to connect';
  }
  if (platform.platform === 'mobile-browser' && hasConnected) {
    return 'Connect additional chains';
  }
  if (platform.platform === 'wallet-browser') {
    return `Detected ${platform.walletBrowser || 'wallet'} browser`;
  }
  return 'Choose a blockchain to connect';
}

// ── Desktop Chain List (unchanged from v0.1) ──

interface DesktopChainListProps {
  visibleChains: ChainOption[];
  colors: Colors;
  isDark: boolean;
  ctx: ReturnType<typeof useBlinkWalletContext>;
  onSelectChain: (chain: ChainType) => void;
}

function DesktopChainList({ visibleChains, colors, isDark, ctx, onSelectChain }: DesktopChainListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {visibleChains.map((chain) => {
        const connected = ctx.isChainConnected(chain.id);
        const addr = ctx.getAddressForChain(chain.id);
        const meta = getChainMeta(chain.id);

        return (
          <div
            key={chain.id}
            onClick={connected ? undefined : () => onSelectChain(chain.id)}
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
}

// ── Mobile Browser View (NEW) ──

interface MobileBrowserViewProps {
  visibleChains: ChainOption[];
  colors: Colors;
  ctx: ReturnType<typeof useBlinkWalletContext>;
  platformInfo: PlatformInfo;
  onSelectChain: (chain: ChainType) => void;
  onConnect: (chain: ChainType) => Promise<void>;
}

function MobileBrowserView({ visibleChains, colors, ctx, platformInfo, onSelectChain, onConnect }: MobileBrowserViewProps) {
  const hasConnected = ctx.connectedWallets.length > 0;

  // Collect unique wallets for visible chains
  const walletApps = useMemo(() => {
    const seen = new Set<string>();
    const result: MobileWalletInfo[] = [];
    for (const chain of visibleChains) {
      for (const wallet of getWalletsForChain(chain.id)) {
        if (!seen.has(wallet.id)) {
          seen.add(wallet.id);
          result.push(wallet);
        }
      }
    }
    return result;
  }, [visibleChains]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Connected wallets (if any) */}
      {hasConnected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {ctx.connectedWallets.map((w) => {
            const chainMeta = ALL_CHAINS.find((c) => c.id === w.chain);
            return (
              <div
                key={w.chain}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.connectedBorder}`,
                  backgroundColor: colors.connectedBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: chainMeta?.gradient || '#3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '12px',
                      flexShrink: 0,
                    }}
                  >
                    {chainMeta?.name[0] || '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: colors.connectedText }}>
                      {chainMeta?.name || w.chain} ✓
                    </div>
                    <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                      {formatAddress(w.address)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => ctx.disconnect(w.chain)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    borderRadius: '6px',
                    backgroundColor: colors.dangerBg,
                    color: colors.dangerText,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Wallet app buttons — for chains handled by AppKit (evm/solana/bitcoin) */}
      <div>
        {hasConnected && (
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: colors.textMuted,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            marginBottom: '8px',
          }}>
            Link another wallet
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* AppKit-powered connections (EVM/Solana/Bitcoin) — opens AppKit modal which handles WC */}
          {visibleChains
            .filter((c) => ['evm', 'solana', 'bitcoin'].includes(c.id) && !ctx.isChainConnected(c.id))
            .map((chain) => (
              <button
                key={chain.id}
                onClick={() => onConnect(chain.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: 'transparent',
                  color: colors.text,
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  width: '100%',
                  transition: 'background-color 0.15s',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: chain.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '13px',
                    flexShrink: 0,
                  }}
                >
                  {chain.name[0]}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div>{chain.name}</div>
                  <div style={{ fontSize: '12px', fontWeight: 400, color: colors.textSecondary }}>
                    Opens wallet selector
                  </div>
                </div>
              </button>
            ))}

          {/* Non-AppKit chains — show chain selector for wallet-specific flows */}
          {visibleChains
            .filter((c) => !['evm', 'solana', 'bitcoin'].includes(c.id) && !ctx.isChainConnected(c.id))
            .map((chain) => (
              <button
                key={chain.id}
                onClick={() => onSelectChain(chain.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: 'transparent',
                  color: colors.text,
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  width: '100%',
                  transition: 'background-color 0.15s',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: chain.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '13px',
                    flexShrink: 0,
                  }}
                >
                  {chain.name[0]}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div>{chain.name}</div>
                  <div style={{ fontSize: '12px', fontWeight: 400, color: colors.textSecondary }}>
                    {chain.description}
                  </div>
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* Future: zkLogin placeholder */}
      {/* 
      <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          Or sign in with
        </div>
        <button>Sign in with Google (Sui)</button>
        <button>Sign in with Apple (Sui)</button>
      </div>
      */}
    </div>
  );
}

// ── Wallet Browser View (NEW) ──

interface WalletBrowserViewProps {
  visibleChains: ChainOption[];
  colors: Colors;
  ctx: ReturnType<typeof useBlinkWalletContext>;
  platformInfo: PlatformInfo;
  onSelectChain: (chain: ChainType) => void;
  onConnect: (chain: ChainType) => Promise<void>;
}

function WalletBrowserView({ visibleChains, colors, ctx, platformInfo, onSelectChain, onConnect }: WalletBrowserViewProps) {
  // Determine which chain the wallet browser natively supports
  const nativeChains = platformInfo.injectedProviders;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Native injected wallet — prominent */}
      <div>
        <div style={{
          fontSize: '12px',
          fontWeight: 600,
          color: colors.textMuted,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.05em',
          marginBottom: '8px',
        }}>
          {platformInfo.walletBrowser ? `${platformInfo.walletBrowser} wallet` : 'Detected wallet'}
        </div>
        {visibleChains
          .filter((c) => nativeChains.includes(c.id))
          .map((chain) => {
            const connected = ctx.isChainConnected(chain.id);
            const addr = ctx.getAddressForChain(chain.id);

            return (
              <div
                key={chain.id}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: `2px solid ${connected ? colors.connectedBorder : colors.accent}`,
                  backgroundColor: connected ? colors.connectedBg : `${colors.accent}11`,
                  cursor: connected ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
                onClick={connected ? undefined : () => onConnect(chain.id)}
                role={connected ? undefined : 'button'}
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
                    {chain.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: colors.text }}>
                      {chain.name}
                    </div>
                    <div style={{ fontSize: '12px', color: connected ? colors.connectedText : colors.textSecondary }}>
                      {connected && addr ? formatAddress(addr) : 'Tap to connect'}
                    </div>
                  </div>
                </div>
                {connected && (
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
                )}
              </div>
            );
          })}
      </div>

      {/* Other chains — via WC or chain-specific flows */}
      {visibleChains.filter((c) => !nativeChains.includes(c.id) && !ctx.isChainConnected(c.id)).length > 0 && (
        <div>
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: colors.textMuted,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            marginBottom: '8px',
          }}>
            Link another chain
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {visibleChains
              .filter((c) => !nativeChains.includes(c.id) && !ctx.isChainConnected(c.id))
              .map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => {
                    if (['evm', 'solana', 'bitcoin'].includes(chain.id)) {
                      onConnect(chain.id);
                    } else {
                      onSelectChain(chain.id);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    backgroundColor: 'transparent',
                    color: colors.text,
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: chain.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '12px',
                      flexShrink: 0,
                    }}
                  >
                    {chain.name[0]}
                  </div>
                  <span>{chain.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '12px', color: colors.textMuted }}>🔗</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Connected wallets from other chains */}
      {ctx.connectedWallets.filter((w) => !nativeChains.includes(w.chain)).length > 0 && (
        <div>
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: colors.textMuted,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            marginBottom: '8px',
          }}>
            Linked wallets
          </div>
          {ctx.connectedWallets
            .filter((w) => !nativeChains.includes(w.chain))
            .map((w) => {
              const chainMeta = ALL_CHAINS.find((c) => c.id === w.chain);
              return (
                <div
                  key={w.chain}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.connectedBorder}`,
                    backgroundColor: colors.connectedBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: colors.connectedText, fontWeight: 600 }}>
                      {chainMeta?.name || w.chain}
                    </span>
                    <span style={{ fontSize: '12px', color: colors.textSecondary }}>
                      {formatAddress(w.address)}
                    </span>
                  </div>
                  <button
                    onClick={() => ctx.disconnect(w.chain)}
                    style={{
                      padding: '2px 6px',
                      fontSize: '11px',
                      borderRadius: '4px',
                      backgroundColor: colors.dangerBg,
                      color: colors.dangerText,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// ── Chain-specific connect views (shared across all platforms) ──

function renderChainConnect(
  selectedChain: ChainType,
  handleConnect: (chain: ChainType) => Promise<void>,
  _handleBack: () => void,
  colors: Colors,
  ctx: ReturnType<typeof useBlinkWalletContext>,
) {
  if (selectedChain === 'sui') {
    return <SuiConnectView colors={colors} onClose={ctx.closeModal} />;
  }

  if (selectedChain === 'starknet') {
    return <StarknetConnectView colors={colors} onClose={ctx.closeModal} />;
  }

  const chain = ALL_CHAINS.find((c) => c.id === selectedChain)!;

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
}

// ── Sui Connect Sub-view ──

function SuiConnectView({ colors, onClose }: { colors: Colors; onClose: () => void }) {
  const wallets = useSuiWallets();
  const { mutate: connectWallet, isPending } = useSuiConnectWallet();
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  const platformInfo = useMemo(() => getPlatformInfo(), []);

  const handleConnect = (wallet: ReturnType<typeof useSuiWallets>[number]) => {
    setError(null);
    setConnecting(wallet.name);
    console.log('[BlinkConnect] Connecting Sui wallet:', wallet.name, wallet);
    connectWallet(
      { wallet },
      {
        onSuccess: () => {
          console.log('[BlinkConnect] Sui wallet connected:', wallet.name);
          setTimeout(onClose, 400);
        },
        onError: (err: Error) => {
          console.error('[BlinkConnect] Sui wallet connect error:', err);
          setError(err?.message || 'Connection failed');
          setConnecting(null);
        },
      }
    );
  };

  const noWallets = wallets.length === 0;
  const isMobile = platformInfo.isMobile;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px' }}>
        {isMobile && noWallets
          ? 'Open a Sui wallet app or install one to connect'
          : 'Select a Sui wallet'}
      </p>
      {error && (
        <p style={{ fontSize: '13px', color: '#ef4444', padding: '8px 12px', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>
          {error}
        </p>
      )}
      {noWallets && !isMobile && (
        <p style={{ fontSize: '13px', color: colors.textMuted, textAlign: 'center', padding: '20px 0' }}>
          No Sui wallets detected. Install a Sui wallet extension.
        </p>
      )}
      {noWallets && isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {getWalletsForChain('sui').map((wallet) => (
            <a
              key={wallet.id}
              href={wallet.appStore || wallet.playStore || '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                backgroundColor: 'transparent',
                color: colors.text,
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              <span style={{ fontSize: '20px' }}>{wallet.icon}</span>
              <div>
                <div>{wallet.name}</div>
                <div style={{ fontSize: '12px', color: colors.textSecondary }}>Install app</div>
              </div>
            </a>
          ))}
        </div>
      )}
      {wallets.map((wallet) => (
        <button
          key={wallet.name}
          onClick={() => handleConnect(wallet)}
          disabled={isPending}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '10px',
            border: `1px solid ${colors.border}`,
            backgroundColor: connecting === wallet.name ? (colors.accent || '#3b82f6') + '22' : 'transparent',
            color: colors.text,
            cursor: isPending ? 'wait' : 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: 'inherit',
            transition: 'background-color 0.15s',
            width: '100%',
            opacity: isPending && connecting !== wallet.name ? 0.5 : 1,
          }}
        >
          {wallet.icon && (
            <img
              src={wallet.icon}
              alt={wallet.name}
              style={{ width: '28px', height: '28px', borderRadius: '6px' }}
            />
          )}
          <span>{connecting === wallet.name && isPending ? `Connecting ${wallet.name}...` : wallet.name}</span>
        </button>
      ))}
    </div>
  );
}

// ── Starknet Connect Sub-view ──

function StarknetConnectView({ colors, onClose }: { colors: Colors; onClose: () => void }) {
  const { connect, connectors } = useStarknetConnect();

  const walletNames = ['Argent X', 'Braavos'];
  const walletEmojis = ['\uD83E\uDD8A', '\uD83D\uDEE1\uFE0F'];

  return (
    <div>
      <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '12px' }}>
        Connect your Starknet wallet
      </p>
      {connectors.map((connector, i: number) => (
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
