// Auth helper functions for JWT and cookies

import type { PlatformContext } from '../platform';

/**
 * Resolve environment variable from platform context.
 */
export function requireEnv(context: PlatformContext, key: 'JWT_SECRET' | 'GEMINI_API_KEY'): string {
  const value = context.env(key);
  if (!value) {
    throw new Error(`${key} environment variable not available`);
  }
  return value;
}

/**
 * Resolve the real origin/hostname from the request.
 * edgeone pages dev rewrites context.request.url to an internal proxy domain,
 * so we prefer Origin or Referer headers which reflect the actual browser URL.
 */
export function resolveOrigin(context: PlatformContext): { origin: string; hostname: string } {
  const originHeader = context.request.headers.get('Origin');
  if (originHeader) {
    const url = new URL(originHeader);
    return { origin: originHeader, hostname: url.hostname };
  }
  const referer = context.request.headers.get('Referer');
  if (referer) {
    const url = new URL(referer);
    return { origin: url.origin, hostname: url.hostname };
  }
  // Fallback to request URL (works in production and npm run dev)
  const url = new URL(context.request.url);
  return { origin: url.origin, hostname: url.hostname };
}

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};

interface JWTPayload {
  sub: string;
  iat: number;
  exp: number;
}

// Convert string to Uint8Array for Web Crypto
function str2ab(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// Convert ArrayBuffer to base64url
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Convert base64url to ArrayBuffer
function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Sign JWT using HMAC-SHA256
export async function signJWT(payload: JWTPayload, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = arrayBufferToBase64Url(str2ab(JSON.stringify(header)));
  const encodedPayload = arrayBufferToBase64Url(str2ab(JSON.stringify(payload)));
  const message = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    str2ab(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, str2ab(message));
  const encodedSignature = arrayBufferToBase64Url(signature);

  return `${message}.${encodedSignature}`;
}

// Verify JWT
export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
    if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

    const message = `${encodedHeader}.${encodedPayload}`;

    const key = await crypto.subtle.importKey(
      'raw',
      str2ab(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = base64UrlToArrayBuffer(encodedSignature);
    const isValid = await crypto.subtle.verify('HMAC', key, signature, str2ab(message));

    if (!isValid) return null;

    const payloadStr = new TextDecoder().decode(base64UrlToArrayBuffer(encodedPayload));
    const payload = JSON.parse(payloadStr) as JWTPayload;

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) return null;

    return payload;
  } catch {
    return null;
  }
}

// Parse cookies from request
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map((cookie) => {
      const [key, ...valueParts] = cookie.trim().split('=');
      return [key, valueParts.join('=')];
    })
  );
}

// Create Set-Cookie header
export function createCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    path?: string;
  } = {}
): string {
  const parts = [`${name}=${value}`];

  if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.path) parts.push(`Path=${options.path}`);

  return parts.join('; ');
}

// Get authenticated user from request
export async function getAuthenticatedUser(
  request: Request,
  jwtSecret: string
): Promise<string | null> {
  const cookies = parseCookies(request.headers.get('Cookie'));
  const token = cookies['auth_token'];
  if (!token) return null;

  const payload = await verifyJWT(token, jwtSecret);
  return payload?.sub || null;
}
