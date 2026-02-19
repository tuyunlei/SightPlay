import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { translations } from '../i18n';

import { ErrorBoundary } from './ErrorBoundary';

const { captureExceptionMock } = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
}));

vi.mock('@sentry/react', () => ({
  captureException: captureExceptionMock,
}));

const ThrowError: React.FC = () => {
  throw new Error('boom');
};

afterEach(() => {
  captureExceptionMock.mockReset();
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders fallback UI and reports to Sentry when child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary t={translations.en}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(translations.en.errorBoundaryTitle)).toBeTruthy();
    expect(screen.getByText(translations.en.errorBoundaryDescription)).toBeTruthy();
    expect(screen.getByRole('button', { name: translations.en.errorBoundaryRetry })).toBeTruthy();
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
  });
});
