import * as Sentry from '@sentry/react';
import type { IdentityTelemetryPort } from '@sightplay/identity-client';

export function createSentryIdentityTelemetry(): IdentityTelemetryPort {
  return {
    reportFailure(event) {
      Sentry.captureException(new Error(`Identity operation failed: ${event.failure.code}`), {
        tags: { flow: event.operation, failureCode: event.failure.code },
        extra: { operationId: event.operationId, retryable: event.failure.retryable },
      });
    },
  };
}
