import type { D1DatabasePort } from '@sightplay/identity-server';

export type PagesFunction = (context: {
  request: Request;
  env: Record<string, unknown> & {
    IDENTITY_DB: D1DatabasePort;
    GEMINI_API_KEY: string;
  };
  params: Record<string, string>;
}) => Response | Promise<Response>;
