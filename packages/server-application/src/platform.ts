import type { IdentityRateLimitPort, IdentityStore } from '@sightplay/identity-server';

export interface PlatformContext {
  request: Request;
  identityStore?: IdentityStore;
  identityRateLimits?: IdentityRateLimitPort;
  clientAddress?: string;
  env(key: string): string | undefined;
  fetch?: typeof globalThis.fetch;
}
