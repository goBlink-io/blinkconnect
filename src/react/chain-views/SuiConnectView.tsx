import React, { useState, useMemo } from 'react';
import {
  useWallets as useSuiWallets,
  useConnectWallet as useSuiConnectWallet,
} from '@mysten/dapp-kit';
import { getPlatformInfo } from '../../core/detector';
import { getWalletsForChain } from '../../utils/deeplinks';

interface Colors {
  textSecondary: string;
  textMuted: string;
  border: string;
  text: string;
  accent: string;
  hoverBg: string;
}

interface SuiConnectViewProps {
  colors: Colors;
  onClose: () => void;
}

export default function SuiConnectView({ colors, onClose }: SuiConnectViewProps) {
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
