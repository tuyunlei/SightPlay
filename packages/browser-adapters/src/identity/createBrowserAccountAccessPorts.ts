import type { AccountAccessPorts } from '@sightplay/account-access-client';

import { createHttpAccountAccessApi } from './httpAccountAccessApi';

export function createBrowserAccountAccessPorts(): AccountAccessPorts {
  return { api: createHttpAccountAccessApi(window.fetch.bind(window)) };
}
