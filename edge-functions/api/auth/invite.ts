import {
  CORS_HEADERS,
  getAuthenticatedUser,
  RequestContext,
  resolveKV,
  resolveEnv,
} from '../_auth-helpers';

// Convert Uint8Array to hex string
function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function onRequestOptions(): Response {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost(context: RequestContext): Promise<Response> {
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

    // Generate random token (32 bytes = 64 hex chars)
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = uint8ArrayToHex(tokenBytes);

    // Store token in KV with 30 minute expiry
    const inviteKey = `invite:${token}`;
    await kv.put(inviteKey, 'valid', { expirationTtl: 1800 });

    return new Response(JSON.stringify({ token, expiresIn: 1800 }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (error) {
    console.error('Error generating invite:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}

export async function onRequestGet(context: RequestContext): Promise<Response> {
  try {
    const kv = resolveKV(context);
    // Get token from query params
    const url = new URL(context.request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(JSON.stringify({ valid: false, error: 'Token required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Check if token exists in KV
    const inviteKey = `invite:${token}`;
    const inviteData = await kv.get(inviteKey);

    return new Response(JSON.stringify({ valid: inviteData !== null }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (error) {
    console.error('Error verifying invite:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}
