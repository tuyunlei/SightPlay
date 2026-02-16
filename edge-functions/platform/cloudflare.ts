import type { KVStore, PlatformContext } from './types';

export interface CFPagesContext {
  request: Request;
  env: {
    // Cloudflare's KVNamespace is structurally compatible with our KVStore.
    // Keep this typed to KVStore to avoid adding @cloudflare/workers-types.
    AUTH_STORE: KVStore;
    JWT_SECRET: string;
    GEMINI_API_KEY: string;
    [key: string]: unknown;
  };
  params: Record<string, string>;
}

export function createCloudflareContext(context: CFPagesContext): PlatformContext {
  return {
    request: context.request,
    kv: context.env.AUTH_STORE,
    env(key: string): string | undefined {
      const value = context.env[key];
      return typeof value === 'string' ? value : undefined;
    },
  };
}
