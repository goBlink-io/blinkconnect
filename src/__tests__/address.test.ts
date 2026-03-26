import { describe, it, expect } from 'vitest';
import { formatAddress, truncateAddress, validateAddress } from '../utils/address';

describe('formatAddress', () => {
  it('should truncate long addresses', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678';
    const formatted = formatAddress(addr);
    expect(formatted.length).toBeLessThan(addr.length);
    expect(formatted).toContain('…');
  });

  it('should return short addresses unchanged', () => {
    expect(formatAddress('alice.near')).toBe('alice.near');
  });

  it('should handle empty string', () => {
    expect(formatAddress('')).toBe('');
  });
});

describe('truncateAddress', () => {
  it('should truncate to 6...4 format', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678';
    const result = truncateAddress(addr);
    expect(result).toContain('…');
    expect(result.length).toBeLessThan(addr.length);
  });
});

describe('validateAddress', () => {
  it('should validate EVM addresses', () => {
    expect(validateAddress('evm', '0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
    expect(validateAddress('evm', 'not-an-address')).toBe(false);
    expect(validateAddress('evm', '0x123')).toBe(false);
  });

  it('should validate Solana addresses', () => {
    expect(validateAddress('solana', '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV')).toBe(true);
    expect(validateAddress('solana', '')).toBe(false);
  });

  it('should validate NEAR addresses', () => {
    expect(validateAddress('near', 'alice.near')).toBe(true);
    expect(validateAddress('near', 'bob.testnet')).toBe(true);
    expect(validateAddress('near', '')).toBe(false);
  });

  it('should validate Sui addresses', () => {
    expect(validateAddress('sui', '0x' + 'a'.repeat(64))).toBe(true);
    expect(validateAddress('sui', '0x123')).toBe(false);
  });

  it('should validate Tron addresses', () => {
    expect(validateAddress('tron', 'T' + '1'.repeat(33))).toBe(true);
    expect(validateAddress('tron', '0x123')).toBe(false);
  });

  it('should return false for empty addresses', () => {
    expect(validateAddress('evm', '')).toBe(false);
    expect(validateAddress('solana', '')).toBe(false);
  });
});
