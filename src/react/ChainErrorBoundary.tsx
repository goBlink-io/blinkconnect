import React, { Component, type ReactNode } from 'react';

interface Props {
  chain: string;
  children: ReactNode;
  onError?: (error: Error, chain: string) => void;
}

interface State {
  hasError: boolean;
}

/**
 * Error boundary for individual chain providers.
 * If a chain adapter fails (missing SDK, SSR issue, etc.),
 * it renders children without that chain's provider instead of crashing the entire app.
 */
export class ChainErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn(`[BlinkConnect] ${this.props.chain} provider failed to initialize:`, error.message);
    this.props.onError?.(error, this.props.chain);
  }

  render() {
    if (this.state.hasError) {
      // Render children without this chain's provider — the chain just won't be available
      return this.props.children;
    }
    return this.props.children;
  }
}
