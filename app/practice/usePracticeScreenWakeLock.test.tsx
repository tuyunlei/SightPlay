import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ScreenWakeLockHandle, ScreenWakeLockPort } from '@sightplay/app-shell';

import { usePracticeScreenWakeLock } from './usePracticeScreenWakeLock';

function screenWakeLock() {
  let visible = true;
  let visibilityListener: (() => void) | null = null;
  let releaseListener: (() => void) | null = null;
  const release = vi.fn(async () => {
    releaseListener?.();
  });
  const handle: ScreenWakeLockHandle = {
    release,
    onRelease: (listener) => {
      releaseListener = listener;
      return () => {
        if (releaseListener === listener) releaseListener = null;
      };
    },
  };
  const request = vi.fn(async () => handle);
  const port: ScreenWakeLockPort = {
    isVisible: () => visible,
    request,
    onVisibilityChange: (listener) => {
      visibilityListener = listener;
      return () => {
        if (visibilityListener === listener) visibilityListener = null;
      };
    },
  };

  return {
    port,
    request,
    release,
    systemRelease() {
      releaseListener?.();
    },
    setVisible(next: boolean) {
      visible = next;
      visibilityListener?.();
    },
  };
}

describe('practice screen wake lock lifecycle', () => {
  it('holds the lock only while practice is active', async () => {
    const wakeLock = screenWakeLock();
    const { rerender } = renderHook(
      ({ active }) => usePracticeScreenWakeLock(active, wakeLock.port),
      { initialProps: { active: false } }
    );

    expect(wakeLock.request).not.toHaveBeenCalled();
    rerender({ active: true });
    await waitFor(() => expect(wakeLock.request).toHaveBeenCalledOnce());

    rerender({ active: false });
    await waitFor(() => expect(wakeLock.release).toHaveBeenCalledOnce());
  });

  it('reacquires after a hidden page becomes visible again', async () => {
    const wakeLock = screenWakeLock();
    renderHook(() => usePracticeScreenWakeLock(true, wakeLock.port));
    await waitFor(() => expect(wakeLock.request).toHaveBeenCalledOnce());

    act(() => {
      wakeLock.setVisible(false);
      wakeLock.systemRelease();
      wakeLock.setVisible(true);
    });

    await waitFor(() => expect(wakeLock.request).toHaveBeenCalledTimes(2));
  });

  it('does not interrupt practice when the browser refuses the request', async () => {
    const port: ScreenWakeLockPort = {
      isVisible: () => true,
      request: vi.fn(async () => {
        throw new DOMException('denied', 'NotAllowedError');
      }),
      onVisibilityChange: () => () => undefined,
    };

    expect(() => renderHook(() => usePracticeScreenWakeLock(true, port))).not.toThrow();
    await waitFor(() => expect(port.request).toHaveBeenCalledOnce());
  });
});
