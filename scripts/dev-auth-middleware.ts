import type { Connect, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

import { E2EHarness } from './e2e-harness.ts';
import { MemoryIdentityStore } from './memory-identity-store.ts';
import { MemoryIdentityRateLimits } from '@sightplay/identity-server';

// Convert Node.js IncomingMessage to Web API Request
async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const protocol = 'http'; // localhost dev
  const host = req.headers.host || '127.0.0.1';
  const url = `${protocol}://${host}${req.url}`;

  // Read body
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const body = Buffer.concat(chunks);

  // Create Web API Request
  const init: RequestInit = {
    method: req.method,
    headers: new Headers(req.headers as Record<string, string>),
  };

  if (body.length > 0 && req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = body;
  }

  return new Request(url, init);
}

// Convert Web API Response to Node.js response
async function fromWebResponse(res: ServerResponse, webResponse: Response): Promise<void> {
  // Set status
  res.statusCode = webResponse.status;

  // Set headers
  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  // Send body
  if (webResponse.body) {
    const reader = webResponse.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }

  res.end();
}

// Route map for edge functions (paths relative to project root)
const ROUTES = [
  {
    path: '/api/auth/register-options',
    module: 'edge-functions/api/auth/register-options.ts',
    handler: 'handlePostRegisterOptions',
    methods: ['POST', 'OPTIONS'],
  },
  {
    path: '/api/auth/register-verify',
    module: 'edge-functions/api/auth/register-verify.ts',
    handler: 'handlePostRegisterVerify',
    methods: ['POST', 'OPTIONS'],
  },
  {
    path: '/api/auth/login-options',
    module: 'edge-functions/api/auth/login-options.ts',
    handler: 'handlePostLoginOptions',
    methods: ['POST', 'OPTIONS'],
  },
  {
    path: '/api/auth/login-verify',
    module: 'edge-functions/api/auth/login-verify.ts',
    handler: 'handlePostLoginVerify',
    methods: ['POST', 'OPTIONS'],
  },
  {
    path: '/api/auth/session',
    module: 'edge-functions/api/auth/session.ts',
    handler: 'handleGetSession',
    methods: ['GET', 'OPTIONS'],
  },
  {
    path: '/api/auth/logout',
    module: 'edge-functions/api/auth/logout.ts',
    handler: 'handlePostLogout',
    methods: ['POST', 'OPTIONS'],
  },
  {
    path: '/api/auth/passkeys',
    module: 'edge-functions/api/auth/passkeys.ts',
    handler: 'handleGetPasskeys',
    methods: ['GET', 'DELETE', 'OPTIONS'],
  },
  {
    path: '/api/auth/invite',
    module: 'edge-functions/api/auth/invite.ts',
    handler: 'handlePostInvite',
    methods: ['GET', 'POST', 'OPTIONS'],
  },
  {
    path: '/api/chat',
    module: 'edge-functions/api/chat.ts',
    handler: 'handlePostChat',
    methods: ['POST', 'OPTIONS'],
  },
];

export function devAuthMiddleware(projectRoot: string, server: ViteDevServer): Connect.NextHandleFunction {
  const localIdentityStore = new MemoryIdentityStore();
  const localIdentityRateLimits = new MemoryIdentityRateLimits();
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  const e2eHarness =
    process.env.SIGHTPLAY_E2E_MODE === '1'
      ? new E2EHarness(
          process.env.SIGHTPLAY_E2E_CONTROL_TOKEN || 'sightplay-local-e2e',
          process.env.SIGHTPLAY_E2E_REAL_PROVIDER === '1'
        )
      : null;

  return async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    const url = req.url || '';

    if (e2eHarness && url.startsWith('/__e2e/')) {
      const controlResponse = await e2eHarness.handleControl(await toWebRequest(req));
      if (controlResponse) {
        await fromWebResponse(res, controlResponse);
        return;
      }
    }

    // Find matching route
    const route = ROUTES.find((r) => url.startsWith(r.path));
    if (!route) {
      return next();
    }

    const method = req.method?.toUpperCase() || 'GET';
    if (!route.methods.includes(method)) {
      return next();
    }

    try {
      // Use Vite's ssrLoadModule to handle TypeScript edge functions
      const modulePath = `${projectRoot}/${route.module}`;
      const edgeModule = await server.ssrLoadModule(modulePath);

      const handlerName =
        method === 'OPTIONS'
          ? 'onRequestOptions'
          : route.path === '/api/auth/passkeys' && method === 'DELETE'
          ? 'handleDeletePasskey'
          : route.handler;
      const handler = edgeModule[handlerName];

      if (!handler) {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }

      // Convert to Web Request
      const webRequest = await toWebRequest(req);

      const identityStore = e2eHarness?.getIdentityStore(webRequest) ?? localIdentityStore;
      const context = {
        request: webRequest,
        identityStore,
        identityRateLimits: localIdentityRateLimits,
        clientAddress: req.socket.remoteAddress,
        fetch: e2eHarness?.getFetch(webRequest),
        env(key: string) {
          const values: Record<string, string> = {
            GEMINI_API_KEY,
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
          return values[key];
        },
      };

      // Call the handler
      const webResponse = await handler(context);

      // Convert back to Node.js response
      await fromWebResponse(res, webResponse);
    } catch (error) {
      console.error('Dev middleware error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  };
}
