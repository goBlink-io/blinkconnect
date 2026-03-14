/**
 * Format an address for display — truncates to first/last N characters.
 */
export function formatAddress(address: string, chars = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

/**
 * Truncate address to a shorter form (6...4).
 */
export function truncateAddress(address: string): string {
  return formatAddress(address, 4);
}

/**
 * Basic address validation by chain type.
 */
export function validateAddress(chain: string, address: string): boolean {
  if (!address || typeof address !== 'string') return false;

  switch (chain) {
    case 'evm':
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    case 'solana':
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    case 'bitcoin':
      return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address);
    case 'sui':
      return /^0x[a-fA-F0-9]{64}$/.test(address);
    case 'near':
      return /^[a-z0-9_-]+(\.[a-z0-9_-]+)*\.(near|testnet)$/.test(address) ||
             /^[a-fA-F0-9]{64}$/.test(address);
    case 'aptos':
      return /^0x[a-fA-F0-9]{1,64}$/.test(address);
    case 'starknet':
      return /^0x[a-fA-F0-9]{1,64}$/.test(address);
    case 'ton':
      return address.length >= 32;
    case 'tron':
      return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
    default:
      return address.length > 0;
  }
}
