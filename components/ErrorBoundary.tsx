import * as Sentry from '@sentry/react';
import React, { Component, type ErrorInfo, type ReactNode } from 'react';

import type { TranslationMap } from '../i18n';

type ErrorBoundaryProps = {
  children: ReactNode;
  t: TranslationMap;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  private readonly handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-dvh items-center justify-center px-4"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            color: 'var(--color-text-primary)',
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border p-6 text-center"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              borderColor: 'var(--color-border)',
            }}
          >
            <h1 className="text-xl font-semibold">{this.props.t.errorBoundaryTitle}</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {this.props.t.errorBoundaryDescription}
            </p>
            <button
              type="button"
              className="mt-4 rounded-lg px-4 py-2 font-medium transition-colors"
              style={{
                backgroundColor: 'var(--color-text-primary)',
                color: 'var(--color-bg-primary)',
              }}
              onClick={this.handleRetry}
            >
              {this.props.t.errorBoundaryRetry}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
