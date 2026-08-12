import type { IdentityPorts } from '@sightplay/identity-client';

import { createBrowserPasskeyPort } from './browserPasskey';
import { createHttpIdentityApi } from './httpIdentityApi';
import { createSentryIdentityTelemetry } from './sentryIdentityTelemetry';

export function createBrowserIdentityPorts(): IdentityPorts {
  return {
    api: createHttpIdentityApi(window.fetch.bind(window)),
    passkey: createBrowserPasskeyPort(),
    telemetry: createSentryIdentityTelemetry(),
  };
}
