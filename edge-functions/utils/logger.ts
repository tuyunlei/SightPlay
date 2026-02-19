interface ErrorDetails {
  message: string;
  stack?: string;
  name?: string;
}

function normalizeError(error: unknown): ErrorDetails {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return {
    message: 'Unknown error',
    stack: JSON.stringify(error),
  };
}

export function logError(context: string, error: unknown, requestContext?: object): void {
  const normalized = normalizeError(error);

  console.error(
    JSON.stringify({
      level: 'error',
      context,
      timestamp: new Date().toISOString(),
      error: normalized,
      request: requestContext,
    })
  );
}

export interface RequestContext {
  requestId: string;
  method: string;
  path: string;
}

export function createRequestContext(request: Request): RequestContext {
  const url = new URL(request.url);
  const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();

  return {
    requestId,
    method: request.method,
    path: url.pathname,
  };
}

export function errorResponse(error: string, requestId: string, status = 500): Response {
  return new Response(JSON.stringify({ error, requestId }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function logBreadcrumb(event: string, requestContext: RequestContext, data?: object): void {
  // Backend Sentry SDK is not configured yet; use structured console logs as breadcrumb fallback.
  console.info(
    JSON.stringify({
      level: 'info',
      type: 'breadcrumb',
      event,
      timestamp: new Date().toISOString(),
      requestId: requestContext.requestId,
      method: requestContext.method,
      path: requestContext.path,
      data,
    })
  );
}
