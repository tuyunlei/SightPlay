import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { PasskeyManagement } from '../PasskeyManagement';

import {
  mockCheckSession,
  setupClipboardMock,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from './PasskeyManagement.setup';

// Mock useAuthContext - must be at the top level
vi.mock('../useAuthContext', () => ({
  useAuthContext: () => ({
    checkSession: mockCheckSession,
  }),
}));

// Setup clipboard before tests
setupClipboardMock();

describe('PasskeyManagement - Generate Invite Link', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    setupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  describe('generate invite link flow', () => {
    it('generates invite link when button clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: 'pk1', name: 'Device', createdAt: Date.now() }],
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'abc123' }),
        } as Response);

      render(<PasskeyManagement onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Generate Invite Link')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Generate Invite Link'));

      await waitFor(() => {
        expect(screen.getByText('Invite Link')).toBeInTheDocument();
      });

      const inviteUrl = `${window.location.origin}/invite?token=abc123`;
      expect(screen.getByText(inviteUrl)).toBeInTheDocument();
      expect(screen.getByText('Valid for 30 minutes • One-time use')).toBeInTheDocument();
    });

    it('shows generating state during invite generation', async () => {
      const user = userEvent.setup();
      let resolveInvite: (value: any) => void;
      const invitePromise = new Promise((resolve) => {
        resolveInvite = resolve;
      });

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: 'pk1', name: 'Device', createdAt: Date.now() }],
        } as Response)
        .mockReturnValueOnce(invitePromise as any);

      render(<PasskeyManagement onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Generate Invite Link')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Generate Invite Link'));

      expect(screen.getByText('Generating...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();

      // Resolve the promise
      resolveInvite!({
        ok: true,
        json: async () => ({ token: 'abc123' }),
      });

      await waitFor(() => {
        expect(screen.getByText('Invite Link')).toBeInTheDocument();
      });
    });

    it('shows error when invite generation fails', async () => {
      const user = userEvent.setup();

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: 'pk1', name: 'Device', createdAt: Date.now() }],
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
        } as Response);

      render(<PasskeyManagement onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Generate Invite Link')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Generate Invite Link'));

      await waitFor(() => {
        expect(screen.getByText('Failed to generate invite link')).toBeInTheDocument();
      });
    });

    it('copies invite link to clipboard', async () => {
      const user = userEvent.setup();

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: 'pk1', name: 'Device', createdAt: Date.now() }],
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'abc123' }),
        } as Response);

      render(<PasskeyManagement onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Generate Invite Link')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Generate Invite Link'));

      await waitFor(() => {
        expect(screen.getByText('Copy Link')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Copy Link'));

      // Check that UI shows "Copied!" feedback
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });

      // Check icon changed temporarily
      expect(screen.queryByText('Copy Link')).not.toBeInTheDocument();
    });

    it('closes invite display when Close button clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: 'pk1', name: 'Device', createdAt: Date.now() }],
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'abc123' }),
        } as Response);

      render(<PasskeyManagement onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Generate Invite Link')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Generate Invite Link'));

      await waitFor(() => {
        expect(screen.getByText('Invite Link')).toBeInTheDocument();
      });

      const closeButtons = screen.getAllByText('Close');
      await user.click(closeButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('Invite Link')).not.toBeInTheDocument();
        expect(screen.getByText('Generate Invite Link')).toBeInTheDocument();
      });
    });
  });
});
