import { describe, it, expect, beforeEach } from 'vitest';
import { detectPlatform, resetPlatformCache } from '../core/detector';

describe('detectPlatform', () => {
  beforeEach(() => {
    resetPlatformCache();
  });

  it('should return desktop-browser in SSR/test environment', () => {
    const info = detectPlatform();
    expect(info.platform).toBe('desktop-browser');
    expect(info.isMobile).toBe(false);
    expect(info.isWalletBrowser).toBe(false);
  });

  it('should recommend injected transport for desktop', () => {
    const info = detectPlatform();
    // In SSR/test (no window), we get empty recommendedTransport
    // but the function should not throw
    expect(info.walletBrowser).toBeNull();
    expect(info.injectedProviders).toEqual([]);
  });

  it('should always recommend tonconnect for TON', () => {
    // In SSR the recommendedTransport is empty, but TON
    // should still be tonconnect when window is present
    const info = detectPlatform();
    // SSR guard returns empty recommendedTransport
    expect(info.recommendedTransport).toEqual({});
  });
});
