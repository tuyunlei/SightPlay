import {
  createEdgeOneContext,
  type EdgeOneRequestContext,
  type PlatformContext,
} from '../../platform';
import { CORS_HEADERS, createCookie } from '../_auth-helpers';

export function onRequestOptions(): Response {
  return new Response(null, { headers: CORS_HEADERS });
}

export function handlePostLogout(platform: PlatformContext): Response {
  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      'Set-Cookie': createCookie('auth_token', '', {
        maxAge: -1,
        httpOnly: true,
        secure: new URL(platform.request.url).protocol === 'https:',
        sameSite: 'Lax',
        path: '/',
      }),
    },
  });
}

export async function onRequestPost(context: EdgeOneRequestContext): Promise<Response> {
  return handlePostLogout(createEdgeOneContext(context));
}
