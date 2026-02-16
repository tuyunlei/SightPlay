import type { KVStore } from '../edge-functions/platform';

export type PagesFunction = (context: {
  request: Request;
  env: Record<string, unknown> & {
    AUTH_STORE: KVStore;
    JWT_SECRET: string;
    GEMINI_API_KEY: string;
  };
  params: Record<string, string>;
}) => Response | Promise<Response>;
