import { useEffect } from 'react';

import type { ScreenWakeLockHandle, ScreenWakeLockPort } from '@sightplay/app-shell';

export function usePracticeScreenWakeLock(
  active: boolean,
  screenWakeLock: ScreenWakeLockPort
): void {
  useEffect(() => {
    if (!active) return;

    let disposed = false;
    let acquiring = false;
    let current: ScreenWakeLockHandle | null = null;
    let stopObservingRelease: (() => void) | null = null;

    const acquire = async () => {
      if (disposed || acquiring || current || !screenWakeLock.isVisible()) return;
      acquiring = true;
      try {
        const acquired = await screenWakeLock.request();
        if (disposed || !screenWakeLock.isVisible()) {
          await acquired.release();
          return;
        }

        current = acquired;
        stopObservingRelease = acquired.onRelease(() => {
          if (current !== acquired) return;
          stopObservingRelease?.();
          stopObservingRelease = null;
          current = null;
        });
      } catch {
        // Wake Lock is advisory: unsupported browsers and system denials must not block practice.
      } finally {
        acquiring = false;
      }
    };

    const stopObservingVisibility = screenWakeLock.onVisibilityChange(() => {
      if (screenWakeLock.isVisible()) void acquire();
    });
    void acquire();

    return () => {
      disposed = true;
      stopObservingVisibility();
      stopObservingRelease?.();
      stopObservingRelease = null;
      const held = current;
      current = null;
      if (held) void held.release();
    };
  }, [active, screenWakeLock]);
}
