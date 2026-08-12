import { useCallback, useEffect, useState } from 'react';

import { parseAppRoute, serializeAppRoute, type AppRoute } from '@sightplay/app-shell';

const OVERLAY_ENTRY_KEY = '__sightplayOverlayEntry';

function readRoute(): AppRoute {
  return parseAppRoute(window.location);
}

export function useBrowserRoute() {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const syncRoute = () => setRoute(readRoute());
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  const navigate = useCallback((nextRoute: AppRoute, replace = false) => {
    const href = serializeAppRoute(nextRoute);
    const currentHref = `${window.location.pathname}${window.location.search}`;
    if (href === currentHref) return;

    const state = !replace && nextRoute.kind === 'passkeys' ? { [OVERLAY_ENTRY_KEY]: true } : null;
    if (replace) window.history.replaceState(state, '', href);
    else window.history.pushState(state, '', href);
    setRoute(nextRoute);
  }, []);

  const dismissOverlay = useCallback(
    (fallbackRoute: AppRoute) => {
      if (window.history.state?.[OVERLAY_ENTRY_KEY] === true) {
        window.history.back();
        return;
      }
      navigate(fallbackRoute, true);
    },
    [navigate]
  );

  return { route, navigate, dismissOverlay };
}
