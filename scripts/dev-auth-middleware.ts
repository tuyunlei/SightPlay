import type { IncomingMessage, ServerResponse } from 'node:http';

import { MemoryIdentityRateLimits } from '@sightplay/identity-server';
import { handleServerRequest, type PlatformContext } from '@sightplay/server-application';
import type { Connect } from 'vite';

import { E2EHarness } from './e2e-harness.ts';
import { MemoryIdentityStore } from './memory-identity-store.ts';

async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host || '127.0.0.1';
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const body = Buffer.concat(chunks);
  const method = req.method ?? 'GET';
  return new Request(`http://${host}${req.url ?? '/'}`, {
    method,
    headers,
    ...(body.length > 0 && method !== 'GET' && method !== 'HEAD' ? { body } : {}),
  });
}

async function fromWebResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (response.body) {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }
  res.end();
}

export function devAuthMiddleware(): Connect.NextHandleFunction {
  const localIdentityStore = new MemoryIdentityStore();
  const localIdentityRateLimits = new MemoryIdentityRateLimits();
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  const e2eHarness =
    process.env.SIGHTPLAY_E2E_MODE === '1'
      ? new E2EHarness(
          process.env.SIGHTPLAY_E2E_CONTROL_TOKEN || 'sightplay-local-e2e',
          process.env.SIGHTPLAY_E2E_REAL_PROVIDER === '1'
        )
      : null;

  return async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    const rawUrl = req.url ?? '/';
    if (e2eHarness && rawUrl.startsWith('/__e2e/')) {
      const controlResponse = await e2eHarness.handleControl(await toWebRequest(req));
      if (controlResponse) {
        await fromWebResponse(res, controlResponse);
        return;
      }
    }
    if (!new URL(rawUrl, 'http://127.0.0.1').pathname.startsWith('/api/')) return next();

    try {
      const request = await toWebRequest(req);
      const values: Readonly<Record<string, string>> = {
        GEMINI_API_KEY: geminiApiKey,
        WEBAUTHN_RP_ID: '127.0.0.1',
        WEBAUTHN_RP_NAME: 'SightPlay',
        IDENTITY_ALLOWED_ORIGINS:
          'http://127.0.0.1:4173,http://127.0.0.1:4174,http://127.0.0.1:5173',
        WEBAUTHN_USER_VERIFICATION: 'preferred',
        IDENTITY_CEREMONY_TTL_MS: '300000',
        IDENTITY_INVITATION_TTL_MS: '604800000',
        IDENTITY_SESSION_TTL_MS: '604800000',
        IDENTITY_RATE_LIMIT_SOURCE_COUNT: '1000',
        IDENTITY_RATE_LIMIT_SOURCE_WINDOW_MS: '60000',
        IDENTITY_RATE_LIMIT_CEREMONY_COUNT: '20',
        IDENTITY_RATE_LIMIT_CEREMONY_WINDOW_MS: '300000',
        IDENTITY_RATE_LIMIT_INVITATION_COUNT: '100',
        IDENTITY_RATE_LIMIT_INVITATION_WINDOW_MS: '60000',
        IDENTITY_RATE_LIMIT_ACCOUNT_COUNT: '100',
        IDENTITY_RATE_LIMIT_ACCOUNT_WINDOW_MS: '3600000',
      };
      const platform: PlatformContext = {
        request,
        identityStore: e2eHarness?.getIdentityStore(request) ?? localIdentityStore,
        identityRateLimits: localIdentityRateLimits,
        clientAddress: req.socket.remoteAddress,
        fetch: e2eHarness?.getFetch(request),
        env: (key) => values[key],
      };
      await fromWebResponse(res, await handleServerRequest(platform));
    } catch (error) {
      console.error('Dev middleware error:', error);
      await fromWebResponse(
        res,
        new Response(JSON.stringify({ error: 'internal_server_error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }
  };
}
