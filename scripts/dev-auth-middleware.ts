import type { Connect, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

import { E2EHarness, MemoryKV } from './e2e-harness.ts';

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
    methods: ['POST', 'OPTIONS'],
  },
  {
    path: '/api/auth/register-verify',
    module: 'edge-functions/api/auth/register-verify.ts',
    methods: ['POST', 'OPTIONS'],
  },
  {
    path: '/api/auth/login-options',
    module: 'edge-functions/api/auth/login-options.ts',
    methods: ['POST', 'OPTIONS'],
  },
  {
    path: '/api/auth/login-verify',
    module: 'edge-functions/api/auth/login-verify.ts',
    methods: ['POST', 'OPTIONS'],
  },
  {
    path: '/api/auth/session',
    module: 'edge-functions/api/auth/session.ts',
    methods: ['GET', 'OPTIONS'],
  },
  {
    path: '/api/auth/logout',
    module: 'edge-functions/api/auth/logout.ts',
    methods: ['POST', 'OPTIONS'],
  },
  {
    path: '/api/auth/passkeys',
    module: 'edge-functions/api/auth/passkeys.ts',
    methods: ['GET', 'DELETE', 'OPTIONS'],
  },
  {
    path: '/api/auth/invite',
    module: 'edge-functions/api/auth/invite.ts',
    methods: ['GET', 'POST', 'OPTIONS'],
  },
  {
    path: '/api/chat',
    module: 'edge-functions/api/chat.ts',
    methods: ['POST', 'OPTIONS'],
  },
];

export function devAuthMiddleware(projectRoot: string, server: ViteDevServer): Connect.NextHandleFunction {
  const memoryKV = new MemoryKV();
  const JWT_SECRET = 'dev-jwt-secret-sightplay';
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  const e2eHarness =
    process.env.SIGHTPLAY_E2E_MODE === '1'
      ? new E2EHarness(
          memoryKV,
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

      // Get the handler for this method
      const handlerName = `onRequest${method.charAt(0) + method.slice(1).toLowerCase()}`;
      const handler = edgeModule[handlerName];

      if (!handler) {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }

      // Convert to Web Request
      const webRequest = await toWebRequest(req);

      // Create context
      const context = {
        request: webRequest,
        fetch: e2eHarness?.getFetch(webRequest),
        env: {
          AUTH_STORE: e2eHarness?.getStore(webRequest) ?? memoryKV,
          JWT_SECRET,
          GEMINI_API_KEY,
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
