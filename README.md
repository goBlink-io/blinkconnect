# @goblink/connect

Universal multi-chain wallet SDK for React. 9 chains, one API.

## Install

```bash
# Core (EVM + Solana + Bitcoin)
pnpm add @goblink/connect wagmi viem @reown/appkit @reown/appkit-adapter-wagmi @reown/appkit-adapter-solana @tanstack/react-query

# Add chains you need:
pnpm add @mysten/dapp-kit          # Sui
pnpm add @hot-labs/near-connect    # NEAR
pnpm add @aptos-labs/wallet-adapter-react  # Aptos
pnpm add @starknet-react/core @starknet-react/chains starknet@^8  # Starknet
pnpm add @tonconnect/ui-react      # TON
pnpm add @tronweb3/tronwallet-adapters @tronweb3/tronwallet-adapter-react-hooks  # Tron
```

## Quick Start

```tsx
import { BlinkConnectProvider, ConnectButton, useWallet } from '@goblink/connect/react';

function App() {
  return (
    <BlinkConnectProvider config={{
      projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
      chains: ['evm', 'solana', 'sui'],  // Only loads what you need
      appName: 'My App',
    }}>
      <ConnectButton />
      <MyComponent />
    </BlinkConnectProvider>
  );
}

function MyComponent() {
  const { wallets, address, connect, disconnect, getAddress, isChainConnected } = useWallet();
  
  return (
    <div>
      {address ? (
        <>
          <p>Connected: {address}</p>
          <button onClick={() => disconnect()}>Disconnect</button>
        </>
      ) : (
        <button onClick={() => connect()}>Connect Wallet</button>
      )}
    </div>
  );
}
```

## Supported Chains

| Chain | Package | Transport |
|-------|---------|-----------|
| EVM (Ethereum, Base, Arbitrum, +10) | Core | Injected / WalletConnect |
| Solana | Core | Injected / WalletConnect |
| Bitcoin | Core | WalletConnect |
| Sui | @mysten/dapp-kit | Injected |
| NEAR | @hot-labs/near-connect | Injected |
| Aptos | @aptos-labs/wallet-adapter-react | Injected |
| Starknet | @starknet-react/core | Injected |
| TON | @tonconnect/ui-react | TonConnect |
| Tron | @tronweb3/tronwallet-adapters | Injected |

## API Reference

### `<BlinkConnectProvider>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| config.projectId | string | required | WalletConnect project ID |
| config.chains | ChainType[] | all | Which chains to enable |
| config.theme | 'light' \| 'dark' | 'dark' | UI theme |
| config.appName | string | - | App name for wallet prompts |
| config.features.persistSession | boolean | true | Remember connections |
| config.features.sessionLinking | boolean | true | Multi-wallet sessions |

### `useWallet()`

| Property | Type | Description |
|----------|------|-------------|
| wallets | ConnectedWallet[] | All connected wallets |
| address | string \| null | Primary wallet address |
| isConnected | boolean | Any wallet connected |
| connect(chain?) | function | Open connect modal |
| disconnect(chain?) | function | Disconnect wallet(s) |
| getAddress(chain) | function | Get address for a chain |
| isChainConnected(chain) | function | Check chain connection |
| platform | PlatformInfo | Device/browser detection |
| primaryWallet | object \| null | Primary wallet details |
| linkedWallets | array | Additional linked wallets |
| linkWallet(chain) | function | Link another chain |
| session | LinkedSession | Full session state |

### `<ConnectButton>`

Drop-in button. Shows "Connect Wallet" or connected address with chain icon.

| Prop | Type | Default |
|------|------|---------|
| label | string | 'Connect Wallet' |
| theme | 'light' \| 'dark' | inherited |
| showChainIcon | boolean | true |

## Mobile Support

The SDK auto-detects the platform and uses the right transport:
- **Desktop browser**: Injected providers (extensions)
- **Mobile wallet browser** (MetaMask app, Phantom app): Injected for native chain, WalletConnect for others
- **Mobile regular browser** (Safari, Chrome): WalletConnect deep links to wallet apps

## Session Linking (v0.2.0)

Connect wallets across multiple chains in a single session:

```tsx
const { primaryWallet, linkedWallets, linkWallet, unlinkWallet } = useWallet();

// Primary: first wallet connected (e.g., EVM)
// Linked: additional wallets (e.g., Solana, Sui)
await linkWallet('solana');  // Opens modal for Solana
```

Sessions persist across page reloads via localStorage.

## Lazy Loading (v0.2.0)

Chain providers are lazy-loaded based on your `config.chains` array. Only the SDKs you actually use get bundled:

```tsx
// Only loads @mysten/dapp-kit and @tonconnect/ui-react
<BlinkConnectProvider config={{
  projectId: 'xxx',
  chains: ['evm', 'solana', 'sui', 'ton'],
}}>
```

If a chain SDK isn't installed, the chain is silently skipped — no crash.

## License

MIT
