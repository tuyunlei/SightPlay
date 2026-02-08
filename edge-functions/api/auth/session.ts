import { CORS_HEADERS, getAuthenticatedUser } from '../_auth-helpers';

interface RequestContext {
  request: Request;
  env: { KV: KVNamespace; JWT_SECRET: string; GEMINI_API_KEY: string };
}

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
    // Check authentication
    const user = await getAuthenticatedUser(context.request, context.env.JWT_SECRET);

    // Check if passkeys exist
    const passkeysData = await context.env.KV.get('passkeys');
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
