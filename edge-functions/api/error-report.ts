import {
  createEdgeOneContext,
  type EdgeOneRequestContext,
  type PlatformContext,
} from '../platform';

import { CORS_HEADERS } from './_auth-helpers';

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

export async function handlePostErrorReport(platform: PlatformContext): Promise<Response> {
  try {
    const body = (await platform.request.json()) as Partial<ErrorReport>;

    const report: ErrorReport = {
      message: body.message || 'Unknown error',
      stack: body.stack,
      url: body.url || '',
      userAgent: platform.request.headers.get('User-Agent') || '',
      timestamp: Date.now(),
      context: body.context,
    };

    const logsData = await platform.kv.get('error_logs');
    const logs: ErrorReport[] = logsData ? JSON.parse(logsData) : [];
    logs.push(report);

    while (logs.length > 50) logs.shift();
    await platform.kv.put('error_logs', JSON.stringify(logs));

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

export async function onRequestPost(context: EdgeOneRequestContext): Promise<Response> {
  return handlePostErrorReport(createEdgeOneContext(context));
}

export async function handleGetErrorReport(platform: PlatformContext): Promise<Response> {
  try {
    const logsData = await platform.kv.get('error_logs');
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

export async function onRequestGet(context: EdgeOneRequestContext): Promise<Response> {
  return handleGetErrorReport(createEdgeOneContext(context));
}
