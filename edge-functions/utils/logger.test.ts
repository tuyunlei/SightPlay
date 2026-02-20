import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { createRequestContext, errorResponse, logBreadcrumb, logError } from './logger';

describe('logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('logs structured error payload with request context', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('boom');

    logError('auth.login', error, { requestId: 'req-1', method: 'POST', path: '/api/auth/login' });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(errorSpy.mock.calls[0][0] as string) as {
      level: string;
      context: string;
      timestamp: string;
      error: { message: string; stack?: string };
      request?: { requestId: string };
    };

    expect(payload.level).toBe('error');
    expect(payload.context).toBe('auth.login');
    expect(payload.error.message).toBe('boom');
    expect(payload.error.stack).toContain('Error: boom');
    expect(payload.request?.requestId).toBe('req-1');
    expect(new Date(payload.timestamp).toISOString()).toBe(payload.timestamp);
  });

  it('creates request context with generated request id', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'uuid-123' });
    const request = new Request('https://example.com/api/auth/login-options', { method: 'POST' });

    const ctx = createRequestContext(request);

    expect(ctx).toEqual({
      requestId: 'uuid-123',
      method: 'POST',
      path: '/api/auth/login-options',
    });
  });

  it('uses inbound X-Request-Id when provided', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'uuid-should-not-be-used' });
    const request = new Request('https://example.com/api/auth/session', {
      method: 'GET',
      headers: { 'X-Request-Id': 'incoming-id' },
    });

    const ctx = createRequestContext(request);

    expect(ctx.requestId).toBe('incoming-id');
    expect(ctx.method).toBe('GET');
    expect(ctx.path).toBe('/api/auth/session');
  });

  it('logs breadcrumb payload as structured JSON', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const requestContext = {
      requestId: 'req-42',
      method: 'POST',
      path: '/api/auth/login',
    };

    logBreadcrumb('auth.login.attempt', requestContext, { strategy: 'passkey' });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(infoSpy.mock.calls[0][0] as string) as {
      level: string;
      type: string;
      event: string;
      timestamp: string;
      requestId: string;
      method: string;
      path: string;
      data?: { strategy: string };
    };

    expect(payload.level).toBe('info');
    expect(payload.type).toBe('breadcrumb');
    expect(payload.event).toBe('auth.login.attempt');
    expect(payload.requestId).toBe('req-42');
    expect(payload.method).toBe('POST');
    expect(payload.path).toBe('/api/auth/login');
    expect(payload.data).toEqual({ strategy: 'passkey' });
    expect(new Date(payload.timestamp).toISOString()).toBe(payload.timestamp);
  });

  it('creates json error response with request id and status', async () => {
    const response = errorResponse('Internal server error', 'req-500', 503);

    expect(response.status).toBe(503);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    await expect(response.json()).resolves.toEqual({
      error: 'Internal server error',
      requestId: 'req-500',
    });
  });
});
