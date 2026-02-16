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

vi.mock('../useAuthContext', () => ({
  useAuthContext: () => ({
    checkSession: mockCheckSession,
  }),
}));

setupClipboardMock();

describe('PasskeyManagement', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    setupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  it('shows loading state initially', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    render(<PasskeyManagement onClose={mockOnClose} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('loads and displays passkeys from API', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'pk1', name: 'My iPhone', createdAt: new Date('2024-01-15').getTime() },
        { id: 'pk2', name: 'My MacBook', createdAt: new Date('2024-02-20').getTime() },
      ],
    } as Response);

    render(<PasskeyManagement onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('My iPhone')).toBeInTheDocument();
      expect(screen.getByText('My MacBook')).toBeInTheDocument();
    });
  });

  it('shows empty state when no passkeys exist', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
    render(<PasskeyManagement onClose={mockOnClose} />);
    expect(await screen.findByText('No passkeys found')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);

    render(<PasskeyManagement onClose={mockOnClose} />);
    await waitFor(() => expect(screen.getByText('Manage Passkeys')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: '' }).closest('button')!);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('clears error when generating new invite after previous error', async () => {
    const user = userEvent.setup();

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'pk1', name: 'Device', createdAt: Date.now() }],
      } as Response)
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ codes: ['ABCD-EFGH'] }),
      } as Response);

    render(<PasskeyManagement onClose={mockOnClose} />);

    await user.click(await screen.findByText('Generate Invite Code'));
    expect(await screen.findByText('Failed to generate invite code')).toBeInTheDocument();

    await user.click(screen.getByText('Generate Invite Code'));
    await waitFor(() => {
      expect(screen.queryByText('Failed to generate invite code')).not.toBeInTheDocument();
      expect(screen.getByText('Invite Code')).toBeInTheDocument();
    });
  });
});
