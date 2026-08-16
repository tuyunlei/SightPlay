import { describe, expect, it, vi } from 'vitest';

import type { IdentityPorts, PortResult } from '../ports';

import { createIdentityRuntime } from './identityRuntime';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

const success = <T>(value: T): PortResult<T> => ({ ok: true, value });

function createPorts(loadSession: IdentityPorts['api']['loadSession']): IdentityPorts {
  return {
    api: {
      loadSession,
      requestLoginOptions: vi.fn(),
      verifyLogin: vi.fn(),
      requestRegistrationOptions: vi.fn(),
      verifyRegistration: vi.fn(),
      logout: vi.fn(),
    },
    passkey: { isSupported: () => true, authenticate: vi.fn(), register: vi.fn() },
    telemetry: { reportFailure: vi.fn() },
  };
}

describe('Identity runtime lifecycle', () => {
  it('publishes the session returned by an injected API port', async () => {
    const ports = createPorts(async () => success({ authenticated: true, hasPasskeys: true }));
    const runtime = createIdentityRuntime(ports);
    const changed = vi.fn();
    runtime.subscribe(changed);

    runtime.start();
    await vi.waitFor(() => expect(runtime.getView().status).toBe('authenticated'));

    expect(changed).toHaveBeenCalled();
    runtime.dispose();
  });

  it('aborts active requests and ignores their late result after disposal', async () => {
    const pending = deferred<PortResult<{ authenticated: boolean; hasPasskeys: boolean }>>();
    let observedSignal: AbortSignal | undefined;
    const ports = createPorts((signal) => {
      observedSignal = signal;
      return pending.promise;
    });
    const runtime = createIdentityRuntime(ports);

    runtime.start();
    runtime.dispose();
    pending.resolve(success({ authenticated: true, hasPasskeys: true }));
    await Promise.resolve();

    expect(observedSignal?.aborted).toBe(true);
    expect(runtime.getView().status).toBe('booting');
  });

  it('starts a fresh epoch when React-style lifecycle replay reactivates the runtime', async () => {
    const loadSession = vi.fn(async () => success({ authenticated: false, hasPasskeys: true }));
    const ports = createPorts(loadSession);
    const runtime = createIdentityRuntime(ports);

    runtime.start();
    runtime.dispose();
    runtime.start();
    await vi.waitFor(() => expect(runtime.getView().status).toBe('anonymous'));

    expect(loadSession).toHaveBeenCalledTimes(2);
    runtime.dispose();
  });
});
