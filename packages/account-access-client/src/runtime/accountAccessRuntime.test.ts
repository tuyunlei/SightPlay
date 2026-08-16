import { describe, expect, it, vi } from 'vitest';

import type { AccountAccessPorts } from '../ports';

import { createAccountAccessRuntime } from './accountAccessRuntime';

describe('Account Access runtime lifecycle', () => {
  it('aborts active capabilities and rejects late results after disposal', async () => {
    let resolveLoad: ((value: { ok: true; value: readonly [] }) => void) | undefined;
    const signalSeen = vi.fn();
    const ports: AccountAccessPorts = {
      api: {
        listCredentials: (signal) => {
          signalSeen(signal);
          return new Promise((resolve) => {
            resolveLoad = resolve;
          });
        },
        createInvitation: vi.fn(),
        revokeCredential: vi.fn(),
      },
    };
    const runtime = createAccountAccessRuntime(ports);
    runtime.start();

    runtime.dispose();
    expect(signalSeen.mock.calls[0][0].aborted).toBe(true);
    resolveLoad?.({ ok: true, value: [] });
    await Promise.resolve();

    expect(runtime.getState().loaded).toBe(false);
  });
});
