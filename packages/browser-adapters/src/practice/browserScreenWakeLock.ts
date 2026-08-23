import type { ScreenWakeLockHandle, ScreenWakeLockPort } from '@sightplay/app-shell';

interface BrowserWakeLockSentinel {
  readonly released: boolean;
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
  removeEventListener(type: 'release', listener: () => void): void;
}

export interface BrowserScreenWakeLockEnvironment {
  readonly navigator: {
    readonly wakeLock?: {
      request(type: 'screen'): Promise<BrowserWakeLockSentinel>;
    };
  };
  readonly document: {
    readonly visibilityState: DocumentVisibilityState;
    addEventListener(type: 'visibilitychange', listener: () => void): void;
    removeEventListener(type: 'visibilitychange', listener: () => void): void;
  };
}

export function createBrowserScreenWakeLockPort(
  environment: BrowserScreenWakeLockEnvironment = { navigator, document }
): ScreenWakeLockPort {
  return {
    isVisible: () => environment.document.visibilityState === 'visible',
    request: async () => {
      const wakeLock = environment.navigator.wakeLock;
      if (!wakeLock) throw new Error('Screen Wake Lock is unavailable');
      return wrapSentinel(await wakeLock.request('screen'));
    },
    onVisibilityChange: (listener) => {
      environment.document.addEventListener('visibilitychange', listener);
      return () => environment.document.removeEventListener('visibilitychange', listener);
    },
  };
}

function wrapSentinel(sentinel: BrowserWakeLockSentinel): ScreenWakeLockHandle {
  return {
    release: () => sentinel.release(),
    onRelease: (listener) => {
      if (sentinel.released) {
        listener();
        return () => undefined;
      }

      sentinel.addEventListener('release', listener);
      if (sentinel.released) {
        sentinel.removeEventListener('release', listener);
        listener();
        return () => undefined;
      }
      return () => sentinel.removeEventListener('release', listener);
    },
  };
}
