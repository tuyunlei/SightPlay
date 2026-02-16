import type { KVStore, PlatformContext } from './types';

export interface EdgeOneRequestContext {
  request: Request;
  env?: Record<string, unknown> & {
    AUTH_STORE?: KVStore;
    JWT_SECRET?: string;
    GEMINI_API_KEY?: string;
  };
}

export function createEdgeOneContext(context: EdgeOneRequestContext): PlatformContext {
  const kv = context.env?.AUTH_STORE ?? (globalThis as Record<string, unknown>).AUTH_STORE;
  if (!kv) {
    throw new Error('AUTH_STORE KV namespace not available');
  }

  return {
    request: context.request,
    kv: kv as KVStore,
    env(key: string): string | undefined {
      const value = context.env?.[key] ?? (globalThis as Record<string, unknown>)[key];
      return typeof value === 'string' ? value : undefined;
    },
  };
}
