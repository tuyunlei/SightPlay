import { describe, expect, it, vi } from 'vitest';

import {
  createBrowserScreenWakeLockPort,
  type BrowserScreenWakeLockEnvironment,
} from './browserScreenWakeLock';

function environment() {
  let visibilityState: DocumentVisibilityState = 'visible';
  const releaseListeners = new Set<() => void>();
  const visibilityListeners = new Set<() => void>();
  const sentinel = {
    released: false,
    release: vi.fn(async () => {
      sentinel.released = true;
      releaseListeners.forEach((listener) => listener());
    }),
    addEventListener: vi.fn((_type: 'release', listener: () => void) => {
      releaseListeners.add(listener);
    }),
    removeEventListener: vi.fn((_type: 'release', listener: () => void) => {
      releaseListeners.delete(listener);
    }),
  };
  const request = vi.fn(async () => sentinel);
  const value: BrowserScreenWakeLockEnvironment = {
    navigator: { wakeLock: { request } },
    document: {
      get visibilityState() {
        return visibilityState;
      },
      addEventListener: (_type, listener) => visibilityListeners.add(listener),
      removeEventListener: (_type, listener) => visibilityListeners.delete(listener),
    },
  };

  return {
    value,
    request,
    sentinel,
    setVisible(visible: boolean) {
      visibilityState = visible ? 'visible' : 'hidden';
      visibilityListeners.forEach((listener) => listener());
    },
  };
}

describe('browser screen wake lock adapter', () => {
  it('maps the browser request and release lifecycle to the capability contract', async () => {
    const browser = environment();
    const port = createBrowserScreenWakeLockPort(browser.value);
    const released = vi.fn();

    expect(port.isVisible()).toBe(true);
    const handle = await port.request();
    const stopObservingRelease = handle.onRelease(released);
    await handle.release();

    expect(browser.request).toHaveBeenCalledWith('screen');
    expect(released).toHaveBeenCalledOnce();
    stopObservingRelease();
  });

  it('reports page visibility changes without exposing the document', () => {
    const browser = environment();
    const port = createBrowserScreenWakeLockPort(browser.value);
    const changed = vi.fn();
    const unsubscribe = port.onVisibilityChange(changed);

    browser.setVisible(false);
    expect(port.isVisible()).toBe(false);
    expect(changed).toHaveBeenCalledOnce();

    unsubscribe();
    browser.setVisible(true);
    expect(changed).toHaveBeenCalledOnce();
  });
});
