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
    console.log('env keys:', Object.keys(context.env));
    // Check authentication
    const user = await getAuthenticatedUser(context.request, resolveEnv(context, 'JWT_SECRET'));

    // Check if passkeys exist
    const passkeysData = await kv.get('passkeys');
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
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error checking session:', msg);
    return new Response(JSON.stringify({ error: 'Internal server error', debug: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}
