import React from 'react';
import { useConnect as useStarknetConnect } from '@starknet-react/core';

interface Colors {
  textSecondary: string;
  border: string;
  text: string;
  accent: string;
  hoverBg: string;
}

interface StarknetConnectViewProps {
  colors: Colors;
  onClose: () => void;
}

const walletNames = ['Argent X', 'Braavos'];
const walletEmojis = ['\uD83E\uDD8A', '\uD83D\uDEE1\uFE0F'];

export default function StarknetConnectView({ colors, onClose }: StarknetConnectViewProps) {
  const { connect, connectors } = useStarknetConnect();

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
