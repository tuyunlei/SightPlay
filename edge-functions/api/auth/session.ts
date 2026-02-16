import { createEdgeOneContext, type EdgeOneRequestContext } from '../../platform';
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

export async function onRequestGet(context: EdgeOneRequestContext): Promise<Response> {
  try {
    const platform = createEdgeOneContext(context);
    // Check authentication
    const user = await getAuthenticatedUser(platform.request, requireEnv(platform, 'JWT_SECRET'));

    // Check if passkeys exist
    const passkeysData = await platform.kv.get('passkeys');
    const passkeys: Passkey[] = passkeysData ? JSON.parse(passkeysData) : [];

    return new Response(
      JSON.stringify({
        authenticated: !!user,
        hasPasskeys: passkeys.length > 0,
      }),
      {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  } catch (error) {
    console.error('Error checking session:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}
