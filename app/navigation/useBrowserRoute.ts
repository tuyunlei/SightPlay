import { useCallback, useEffect, useState } from 'react';

import { parseAppRoute, serializeAppRoute, type AppRoute } from '@sightplay/app-shell';

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
    if (replace) window.history.replaceState(null, '', href);
    else window.history.pushState(null, '', href);
    setRoute(nextRoute);
  }, []);

  return { route, navigate };
}
