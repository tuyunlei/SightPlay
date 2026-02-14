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

describe('PasskeyManagement', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    setupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
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
        expect(screen.getAllByText(/Added.*2024/)).toHaveLength(2);
      });
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
