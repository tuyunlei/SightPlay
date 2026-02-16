import {
  createEdgeOneContext,
  type EdgeOneRequestContext,
  type PlatformContext,
} from '../../platform';
import { CORS_HEADERS, getAuthenticatedUser, requireEnv } from '../_auth-helpers';

function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function onRequestOptions(): Response {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function handlePostInvite(platform: PlatformContext): Promise<Response> {
  try {
    const user = await getAuthenticatedUser(platform.request, requireEnv(platform, 'JWT_SECRET'));
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = uint8ArrayToHex(tokenBytes);

    const inviteKey = `invite:${token}`;
    await platform.kv.put(inviteKey, 'valid', { expirationTtl: 1800 });

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

export async function onRequestPost(context: EdgeOneRequestContext): Promise<Response> {
  return handlePostInvite(createEdgeOneContext(context));
}

export async function handleGetInvite(platform: PlatformContext): Promise<Response> {
  try {
    const url = new URL(platform.request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(JSON.stringify({ valid: false, error: 'Token required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const inviteKey = `invite:${token}`;
    const inviteData = await platform.kv.get(inviteKey);

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

export async function onRequestGet(context: EdgeOneRequestContext): Promise<Response> {
  return handleGetInvite(createEdgeOneContext(context));
}
