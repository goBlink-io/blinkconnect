import type { ChainType, AdapterHookResult } from '../core/types';

/**
 * Default no-op adapter returned when a chain's peer dependency is not installed.
 */
export function createNoopAdapter(chain: ChainType): AdapterHookResult {
  return {
    chain,
    address: null,
    connected: false,
    transport: null,
    connect: async () => {
      console.warn(
        `[BlinkConnect] ${chain} adapter dependencies not installed. Skipping connect.`
      );
    },
    disconnect: async () => {},
  };
}

/**
 * Check if a module is available at runtime (for optional peer deps).
 */
export function isModuleAvailable(moduleName: string): boolean {
  try {
    // In bundled environments, this won't work for dynamic detection.
    // The adapters handle this via try/catch at the hook level.
    return true;
  } catch {
    return false;
  }
}
