import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from '../core/session';

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  it('should start with empty session', () => {
    expect(manager.count).toBe(0);
    expect(manager.getSession().primary).toBeNull();
  });

  it('should set primary wallet', () => {
    manager.setPrimary('evm', '0x123', 'injected');
    expect(manager.count).toBe(1);
    expect(manager.getSession().primary?.chain).toBe('evm');
    expect(manager.getAddress('evm')).toBe('0x123');
  });

  it('should link additional wallets', () => {
    manager.setPrimary('evm', '0x123', 'injected');
    manager.linkWallet('solana', 'abc123', 'injected');
    expect(manager.count).toBe(2);
    expect(manager.getAddress('solana')).toBe('abc123');
  });

  it('should promote linked wallet when primary is unlinked', () => {
    manager.setPrimary('evm', '0x123', 'injected');
    manager.linkWallet('solana', 'abc123', 'injected');
    manager.unlinkWallet('evm');
    expect(manager.getSession().primary?.chain).toBe('solana');
    expect(manager.count).toBe(1);
  });

  it('should not duplicate chains', () => {
    manager.setPrimary('evm', '0x123', 'injected');
    manager.linkWallet('evm', '0x456', 'walletconnect');
    expect(manager.count).toBe(1);
    expect(manager.getAddress('evm')).toBe('0x456');
  });

  it('should track transport per chain', () => {
    manager.setPrimary('evm', '0x123', 'injected');
    manager.linkWallet('solana', 'abc', 'walletconnect');
    expect(manager.getTransport('evm')).toBe('injected');
    expect(manager.getTransport('solana')).toBe('walletconnect');
  });

  it('should clear all wallets', () => {
    manager.setPrimary('evm', '0x123', 'injected');
    manager.linkWallet('solana', 'abc', 'injected');
    manager.clear();
    expect(manager.count).toBe(0);
  });
});
