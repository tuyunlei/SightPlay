import { CORS_HEADERS, getAuthenticatedUser } from '../_auth-helpers';

interface RequestContext {
  request: Request;
  env: { AUTH_STORE: KVNamespace; JWT_SECRET: string; GEMINI_API_KEY: string };
}

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
    // Require authentication
    const user = await getAuthenticatedUser(context.request, context.env.JWT_SECRET);
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
    await context.env.AUTH_STORE.put(inviteKey, 'valid', { expirationTtl: 1800 });

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
    const inviteData = await context.env.AUTH_STORE.get(inviteKey);

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
