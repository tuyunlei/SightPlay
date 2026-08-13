import {
  createD1IdentityRateLimits,
  createD1IdentityStore,
  type D1DatabasePort,
} from '@sightplay/identity-server';

import type { PlatformContext } from './types';

export interface CFPagesContext {
  request: Request;
  env: {
    IDENTITY_DB: D1DatabasePort;
    GEMINI_API_KEY: string;
    [key: string]: unknown;
  };
  params: Record<string, string>;
}

export function createCloudflareContext(context: CFPagesContext): PlatformContext {
  return {
    request: context.request,
    identityStore: createD1IdentityStore(context.env.IDENTITY_DB),
    identityRateLimits: createD1IdentityRateLimits(context.env.IDENTITY_DB),
    clientAddress: context.request.headers.get('CF-Connecting-IP') ?? undefined,
    fetch: globalThis.fetch.bind(globalThis),
    env(key: string): string | undefined {
      const value = context.env[key];
      return typeof value === 'string' ? value : undefined;
    },
  };
}
