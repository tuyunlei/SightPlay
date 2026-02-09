import { CORS_HEADERS, getAuthenticatedUser, RequestContext, resolveKV, resolveEnv } from '../_auth-helpers';

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

export async function onRequestGet(context: RequestContext): Promise<Response> {
  try {
    const kv = resolveKV(context);
    // Require authentication
    const user = await getAuthenticatedUser(context.request, resolveEnv(context, 'JWT_SECRET'));
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Get passkeys (exclude sensitive data)
    const passkeysData = await kv.get('passkeys');
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
    console.error('Error listing passkeys:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}

export async function onRequestDelete(context: RequestContext): Promise<Response> {
  try {
    const kv = resolveKV(context);
    // Require authentication
    const user = await getAuthenticatedUser(context.request, resolveEnv(context, 'JWT_SECRET'));
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Get passkey ID from query params
    const url = new URL(context.request.url);
    const passkeyId = url.searchParams.get('id');

    if (!passkeyId) {
      return new Response(JSON.stringify({ error: 'Passkey ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Get passkeys
    const passkeysData = await kv.get('passkeys');
    const passkeys: Passkey[] = passkeysData ? JSON.parse(passkeysData) : [];

    // Prevent removing the last passkey
    if (passkeys.length === 1) {
      return new Response(JSON.stringify({ error: 'Cannot remove the last passkey' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Remove the passkey
    const updatedPasskeys = passkeys.filter((pk) => pk.id !== passkeyId);

    if (updatedPasskeys.length === passkeys.length) {
      return new Response(JSON.stringify({ error: 'Passkey not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    await kv.put('passkeys', JSON.stringify(updatedPasskeys));

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (error) {
    console.error('Error deleting passkey:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}
