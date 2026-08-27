import type { PlatformContext } from './platform';
import {
  handleDeleteInvitationAccess,
  handleGetInvitationAccess,
  handlePostInvitationAccess,
} from './routes/auth/invitation-access';
import {
  handleGetInviteByCode,
  handlePostInvite,
  handlePostInviteBootstrap,
} from './routes/auth/invite';
import { handlePostLoginOptions } from './routes/auth/login-options';
import { handlePostLoginVerify } from './routes/auth/login-verify';
import { handlePostLogout } from './routes/auth/logout';
import { handleDeletePasskey, handleGetPasskeys } from './routes/auth/passkeys';
import { handlePostRegisterOptions } from './routes/auth/register-options';
import { handlePostRegisterVerify } from './routes/auth/register-verify';
import { handleGetSession } from './routes/auth/session';
import { handlePostChat } from './routes/chat';

type ServerHandler = (platform: PlatformContext) => Promise<Response>;
type HttpMethod = 'GET' | 'POST' | 'DELETE';

interface ServerRoute {
  readonly id: string;
  readonly matches: (path: string) => boolean;
  readonly handlers: Readonly<Partial<Record<HttpMethod, ServerHandler>>>;
}

const exact = (expected: string) => (path: string) => path === expected;

function isHttpMethod(value: string): value is HttpMethod {
  return value === 'GET' || value === 'POST' || value === 'DELETE';
}

const ROUTES: readonly ServerRoute[] = [
  {
    id: 'register-options',
    matches: exact('/api/auth/register-options'),
    handlers: { POST: handlePostRegisterOptions },
  },
  {
    id: 'register-verify',
    matches: exact('/api/auth/register-verify'),
    handlers: { POST: handlePostRegisterVerify },
  },
  {
    id: 'login-options',
    matches: exact('/api/auth/login-options'),
    handlers: { POST: handlePostLoginOptions },
  },
  {
    id: 'login-verify',
    matches: exact('/api/auth/login-verify'),
    handlers: { POST: handlePostLoginVerify },
  },
  { id: 'session', matches: exact('/api/auth/session'), handlers: { GET: handleGetSession } },
  { id: 'logout', matches: exact('/api/auth/logout'), handlers: { POST: handlePostLogout } },
  {
    id: 'passkeys',
    matches: exact('/api/auth/passkeys'),
    handlers: { GET: handleGetPasskeys, DELETE: handleDeletePasskey },
  },
  {
    id: 'identity-bootstrap-invitations',
    matches: exact('/api/auth/bootstrap/invitations'),
    handlers: { POST: handlePostInviteBootstrap },
  },
  { id: 'invite', matches: exact('/api/auth/invite'), handlers: { POST: handlePostInvite } },
  {
    id: 'invitation-access',
    matches: exact('/api/auth/invitation-access'),
    handlers: {
      GET: handleGetInvitationAccess,
      POST: handlePostInvitationAccess,
      DELETE: handleDeleteInvitationAccess,
    },
  },
  {
    id: 'invite-code',
    matches: (path) => /^\/api\/auth\/invite\/[^/]+$/.test(path),
    handlers: { GET: handleGetInviteByCode },
  },
  { id: 'chat', matches: exact('/api/chat'), handlers: { POST: handlePostChat } },
];

export interface ResolvedServerRoute {
  readonly id: string;
  readonly handler: ServerHandler | null;
  readonly allow: readonly string[];
}

export function resolveServerRoute(request: Request): ResolvedServerRoute | null {
  const route = ROUTES.find((candidate) => candidate.matches(new URL(request.url).pathname));
  if (!route) return null;
  const allow = [...Object.keys(route.handlers), 'OPTIONS'];
  const method = request.method.toUpperCase();
  return {
    id: route.id,
    handler: isHttpMethod(method) ? (route.handlers[method] ?? null) : null,
    allow,
  };
}

export async function handleServerRequest(platform: PlatformContext): Promise<Response> {
  const route = resolveServerRoute(platform.request);
  if (!route) return jsonError('not_found', 404);
  if (platform.request.method.toUpperCase() === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { Allow: route.allow.join(', ') } });
  }
  if (!route.handler) {
    return jsonError('method_not_allowed', 405, { Allow: route.allow.join(', ') });
  }
  return route.handler(platform);
}

function jsonError(error: string, status: number, headers?: HeadersInit): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
