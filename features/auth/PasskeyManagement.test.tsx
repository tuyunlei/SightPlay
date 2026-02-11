import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { PasskeyManagement } from './PasskeyManagement';

// Mock useAuthContext
const mockCheckSession = vi.fn();
vi.mock('./useAuthContext', () => ({
  useAuthContext: () => ({
    checkSession: mockCheckSession,
  }),
}));

// Mock clipboard API - must be done before importing the component
const mockWriteText = vi.fn().mockResolvedValue(undefined);
global.navigator.clipboard = {
  writeText: mockWriteText,
} as any;

// Mock window.confirm
const originalConfirm = window.confirm;

describe('PasskeyManagement', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    window.confirm = vi.fn(() => true);
    mockWriteText.mockClear();
  });

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  describe('passkey list loading and display', () => {
    it('shows loading state initially', () => {
      vi.mocked(fetch).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<PasskeyManagement onClose={mockOnClose} />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('loads and displays passkeys from API', async () => {
      const mockPasskeys = [
        { id: 'pk1', name: 'My iPhone', createdAt: new Date('2024-01-15').getTime() },
        { id: 'pk2', name: 'My MacBook', createdAt: new Date('2024-02-20').getTime() },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPasskeys,
      } as Response);

      render(<PasskeyManagement onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('My iPhone')).toBeInTheDocument();
        expect(screen.getByText('My MacBook')).toBeInTheDocument();
      });

      expect(screen.getByText('Added 1/15/2024')).toBeInTheDocument();
      expect(screen.getByText('Added 2/20/2024')).toBeInTheDocument();
    });

    it('shows empty state when no passkeys exist', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      render(<PasskeyManagement onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('No passkeys found')).toBeInTheDocument();
      });
    });

    it('shows empty list when API fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
      } as Response);

      render(<PasskeyManagement onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('No passkeys found')).toBeInTheDocument();
      });
    });
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

  describe('delete passkey functionality', () => {
    it('prevents deletion of last passkey', async () => {
      const user = userEvent.setup();

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'pk1', name: 'Last Device', createdAt: Date.now() }],
      } as Response);

      render(<PasskeyManagement onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Last Device')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /remove|trash/i });
      expect(deleteButton).toBeDisabled();
      expect(deleteButton).toHaveAttribute('title', 'Cannot remove the last passkey');

      await user.click(deleteButton);

      // No deletion API call should be made
      expect(fetch).toHaveBeenCalledTimes(1); // Only the initial load
    });

    it('delete button for last passkey has correct disabled state and title', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'pk1', name: 'Last Device', createdAt: Date.now() }],
      } as Response);

      render(<PasskeyManagement onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Last Device')).toBeInTheDocument();
      });

      const deleteButton = screen.getByTitle('Cannot remove the last passkey');

      expect(deleteButton).toBeDisabled();
      expect(deleteButton).toHaveAttribute('title', 'Cannot remove the last passkey');
    });

    it('deletes passkey when confirmed and multiple passkeys exist', async () => {
      const user = userEvent.setup();

      const mockPasskeys = [
        { id: 'pk1', name: 'iPhone', createdAt: Date.now() },
        { id: 'pk2', name: 'MacBook', createdAt: Date.now() },
      ];

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPasskeys,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: 'pk1', name: 'iPhone', createdAt: Date.now() }],
        } as Response);

      render(<PasskeyManagement onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('iPhone')).toBeInTheDocument();
        expect(screen.getByText('MacBook')).toBeInTheDocument();
      });

      // Get all delete buttons with title="Remove" and click the second one (MacBook)
      const deleteButtons = screen.getAllByTitle('Remove');
      await user.click(deleteButtons[1]);

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to remove this passkey?');

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/auth/passkeys?id=pk2',
          expect.objectContaining({
            method: 'DELETE',
            credentials: 'include',
          })
        );
      });

      // Check that passkeys are reloaded
      await waitFor(() => {
        expect(screen.getByText('iPhone')).toBeInTheDocument();
        expect(screen.queryByText('MacBook')).not.toBeInTheDocument();
      });

      // Check that session is refreshed
      expect(mockCheckSession).toHaveBeenCalled();
    });

    it('does not delete passkey when user cancels confirmation', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn(() => false);

      const mockPasskeys = [
        { id: 'pk1', name: 'iPhone', createdAt: Date.now() },
        { id: 'pk2', name: 'MacBook', createdAt: Date.now() },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPasskeys,
      } as Response);

      render(<PasskeyManagement onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('iPhone')).toBeInTheDocument();
        expect(screen.getByText('MacBook')).toBeInTheDocument();
      });

      // Get all delete buttons with title="Remove" and click the second one (MacBook)
      const deleteButtons = screen.getAllByTitle('Remove');
      await user.click(deleteButtons[1]);

      expect(window.confirm).toHaveBeenCalled();

      // Only the initial fetch, no delete API call
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('shows error when passkey deletion fails', async () => {
      const user = userEvent.setup();

      const mockPasskeys = [
        { id: 'pk1', name: 'iPhone', createdAt: Date.now() },
        { id: 'pk2', name: 'MacBook', createdAt: Date.now() },
      ];

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPasskeys,
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
        } as Response);

      render(<PasskeyManagement onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('MacBook')).toBeInTheDocument();
      });

      // Get all delete buttons with title="Remove" and click the second one (MacBook)
      const deleteButtons = screen.getAllByTitle('Remove');
      await user.click(deleteButtons[1]);

      await waitFor(() => {
        expect(screen.getByText('Failed to remove passkey')).toBeInTheDocument();
      });

      // Session should not be checked when deletion fails
      expect(mockCheckSession).not.toHaveBeenCalled();
    });
  });

  describe('modal interaction', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      render(<PasskeyManagement onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Manage Passkeys')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: '' }).closest('button')!;
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('clears error when generating new invite after previous error', async () => {
      const user = userEvent.setup();

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: 'pk1', name: 'Device', createdAt: Date.now() }],
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'abc123' }),
        } as Response);

      render(<PasskeyManagement onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Generate Invite Link')).toBeInTheDocument();
      });

      // First attempt - fails
      await user.click(screen.getByText('Generate Invite Link'));

      await waitFor(() => {
        expect(screen.getByText('Failed to generate invite link')).toBeInTheDocument();
      });

      // Second attempt - succeeds
      await user.click(screen.getByText('Generate Invite Link'));

      await waitFor(() => {
        expect(screen.queryByText('Failed to generate invite link')).not.toBeInTheDocument();
        expect(screen.getByText('Invite Link')).toBeInTheDocument();
      });
    });
  });
});
