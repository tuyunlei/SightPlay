import {
  createEdgeOneContext,
  type EdgeOneRequestContext,
  type PlatformContext,
} from '../../platform';
import { createRequestContext, logError } from '../../utils/logger';
import { CORS_HEADERS, getAuthenticatedUser, requireEnv } from '../_auth-helpers';

interface Passkey {
  id: string;
  publicKey: string;
  counter: number;
  name: string;
  createdAt: number;
  transports?: string[];
}

export function onRequestOptions(): Response {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function handleGetPasskeys(platform: PlatformContext): Promise<Response> {
  const requestContext = createRequestContext(platform.request);

  try {
    const user = await getAuthenticatedUser(platform.request, requireEnv(platform, 'JWT_SECRET'));
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required', requestId: requestContext.requestId }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        }
      );
    }

    const passkeysData = await platform.kv.get('passkeys');
    const passkeys: Passkey[] = passkeysData ? JSON.parse(passkeysData) : [];

    const safePasskeys = passkeys.map((pk) => ({
      id: pk.id,
      name: pk.name,
      createdAt: pk.createdAt,
    }));

    return new Response(JSON.stringify(safePasskeys), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (error) {
    logError('auth.passkeys.list', error, requestContext);
    return new Response(
      JSON.stringify({ error: 'Internal server error', requestId: requestContext.requestId }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }
}

export async function onRequestGet(context: EdgeOneRequestContext): Promise<Response> {
  return handleGetPasskeys(createEdgeOneContext(context));
}

export async function handleDeletePasskey(platform: PlatformContext): Promise<Response> {
  const requestContext = createRequestContext(platform.request);

  try {
    const user = await getAuthenticatedUser(platform.request, requireEnv(platform, 'JWT_SECRET'));
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required', requestId: requestContext.requestId }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        }
      );
    }

    const url = new URL(platform.request.url);
    const passkeyId = url.searchParams.get('id');

    if (!passkeyId) {
      return new Response(
        JSON.stringify({ error: 'Passkey ID required', requestId: requestContext.requestId }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        }
      );
    }

    const passkeysData = await platform.kv.get('passkeys');
    const passkeys: Passkey[] = passkeysData ? JSON.parse(passkeysData) : [];

    if (passkeys.length === 1) {
      return new Response(
        JSON.stringify({
          error: 'Cannot remove the last passkey',
          requestId: requestContext.requestId,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        }
      );
    }

    const updatedPasskeys = passkeys.filter((pk) => pk.id !== passkeyId);

    if (updatedPasskeys.length === passkeys.length) {
      return new Response(
        JSON.stringify({ error: 'Passkey not found', requestId: requestContext.requestId }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        }
      );
    }

    await platform.kv.put('passkeys', JSON.stringify(updatedPasskeys));

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (error) {
    logError('auth.passkeys.delete', error, requestContext);
    return new Response(
      JSON.stringify({ error: 'Internal server error', requestId: requestContext.requestId }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }
}

export async function onRequestDelete(context: EdgeOneRequestContext): Promise<Response> {
  return handleDeletePasskey(createEdgeOneContext(context));
}
