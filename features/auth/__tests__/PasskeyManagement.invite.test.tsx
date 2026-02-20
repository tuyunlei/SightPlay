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

describe('PasskeyManagement - Generate Invite Code', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    setupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  it('generates invite code when button clicked', async () => {
    const user = userEvent.setup();

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'pk1', name: 'Device', createdAt: Date.now() }],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ codes: ['ABCD-EFGH'] }),
      } as Response);

    render(<PasskeyManagement onClose={mockOnClose} />);

    await user.click(await screen.findByText('Generate Invite Code'));

    expect(await screen.findByText('Invite Code')).toBeInTheDocument();
    expect(screen.getByText('ABCD-EFGH')).toBeInTheDocument();
    expect(screen.getByText('Valid for 7 days • One-time use')).toBeInTheDocument();
  });

  it('shows generating state', async () => {
    const user = userEvent.setup();
    let resolveInvite: ((value: Response) => void) | undefined;
    const invitePromise = new Promise<Response>((resolve) => {
      resolveInvite = resolve;
    });

    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
      .mockReturnValueOnce(invitePromise as Promise<Response>);

    render(<PasskeyManagement onClose={mockOnClose} />);

    await user.click(await screen.findByText('Generate Invite Code'));

    expect(screen.getByText('Generating...')).toBeInTheDocument();

    if (!resolveInvite) {
      throw new Error('Expected invite resolver to be set');
    }
    resolveInvite({ ok: true, json: async () => ({ codes: ['ABCD-EFGH'] }) } as Response);
    expect(await screen.findByText('Invite Code')).toBeInTheDocument();
  });

  it('shows error on failure', async () => {
    const user = userEvent.setup();

    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
      .mockResolvedValueOnce({ ok: false } as Response);

    render(<PasskeyManagement onClose={mockOnClose} />);
    await user.click(await screen.findByText('Generate Invite Code'));

    expect(await screen.findByText('Failed to generate invite code')).toBeInTheDocument();
  });

  it('copies invite code to clipboard', async () => {
    const user = userEvent.setup();

    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ codes: ['ABCD-EFGH'] }),
      } as Response);

    render(<PasskeyManagement onClose={mockOnClose} />);
    await user.click(await screen.findByText('Generate Invite Code'));
    await user.click(await screen.findByText('Copy Code'));

    await waitFor(() => expect(screen.getByText('Copied!')).toBeInTheDocument());
  });

  it('can close invite code display', async () => {
    const user = userEvent.setup();

    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ codes: ['ABCD-EFGH'] }),
      } as Response);

    render(<PasskeyManagement onClose={mockOnClose} />);
    await user.click(await screen.findByText('Generate Invite Code'));
    await user.click((await screen.findAllByText('Close'))[0]);

    expect(screen.queryByText('Invite Code')).not.toBeInTheDocument();
    expect(screen.getByText('Generate Invite Code')).toBeInTheDocument();
  });
});
