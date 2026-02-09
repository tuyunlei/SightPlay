import { CORS_HEADERS, RequestContext, resolveKV } from './_auth-helpers';

interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  timestamp: number;
  context?: string;
}

export function onRequestOptions(): Response {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost(context: RequestContext): Promise<Response> {
  try {
    const kv = resolveKV(context);
    const body = (await context.request.json()) as Partial<ErrorReport>;

    const report: ErrorReport = {
      message: body.message || 'Unknown error',
      stack: body.stack,
      url: body.url || '',
      userAgent: context.request.headers.get('User-Agent') || '',
      timestamp: Date.now(),
      context: body.context,
    };

    // Store in KV with timestamp key, keep last 50 errors
    const logsData = await kv.get('error_logs');
    const logs: ErrorReport[] = logsData ? JSON.parse(logsData) : [];
    logs.push(report);

    // Keep only last 50
    while (logs.length > 50) logs.shift();
    await kv.put('error_logs', JSON.stringify(logs));

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}

// GET to read error logs (requires auth)
export async function onRequestGet(context: RequestContext): Promise<Response> {
  try {
    const kv = resolveKV(context);
    const logsData = await kv.get('error_logs');
    const logs = logsData ? JSON.parse(logsData) : [];

    return new Response(JSON.stringify(logs, null, 2), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}
