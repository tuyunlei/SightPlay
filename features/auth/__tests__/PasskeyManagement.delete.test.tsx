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

describe('PasskeyManagement - Delete Passkey', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    setupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
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
});
