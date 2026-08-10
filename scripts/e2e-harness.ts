import type { KVStore } from '../edge-functions/platform/index.ts';
import { inviteKey } from '../edge-functions/api/auth/invite-code.ts';

const E2E_RUN_HEADER = 'X-SightPlay-E2E-Run';
const E2E_CONTROL_HEADER = 'X-SightPlay-E2E-Control';

type StoredValue = { value: string; expiresAt?: number };

export class MemoryKV implements KVStore {
  private readonly store = new Map<string, StoredValue>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: options?.expirationTtl
        ? Date.now() + options.expirationTtl * 1000
        : undefined,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  scoped(runId: string): KVStore {
    const prefix = `${runId}:`;
    return {
      get: (key) => this.get(`${prefix}${key}`),
      put: (key, value, options) => this.put(`${prefix}${key}`, value, options),
      delete: (key) => this.delete(`${prefix}${key}`),
    };
  }

  clearScope(runId: string): void {
    const prefix = `${runId}:`;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}

type ChatScenario =
  | { kind: 'success'; replyText: string; challengeData?: object | null }
  | { kind: 'upstreamError'; status: number }
  | { kind: 'invalidPayload' };

type ControlCommand =
  | { action: 'reset' }
  | { action: 'seedInvite'; code: string; expiresAt?: number }
  | { action: 'setChatScenario'; scenario: ChatScenario };

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export class E2EHarness {
  private readonly chatScenarios = new Map<string, ChatScenario>();

  constructor(
    private readonly kv: MemoryKV,
    private readonly controlToken: string,
    private readonly allowRealProvider = false
  ) {}

  getRunId(request: Request): string {
    return request.headers.get(E2E_RUN_HEADER) || 'default';
  }

  getStore(request: Request): KVStore {
    return this.kv.scoped(this.getRunId(request));
  }

  async handleControl(request: Request): Promise<Response | null> {
    if (new URL(request.url).pathname !== '/__e2e/control') return null;
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    if (request.headers.get(E2E_CONTROL_HEADER) !== this.controlToken) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const runId = this.getRunId(request);
    const command = (await request.json()) as ControlCommand;
    const store = this.kv.scoped(runId);

    switch (command.action) {
      case 'reset':
        this.kv.clearScope(runId);
        this.chatScenarios.delete(runId);
        return json({ ok: true });
      case 'seedInvite': {
        const now = Date.now();
        const expiresAt = command.expiresAt ?? now + 60 * 60 * 1000;
        await store.put(
          inviteKey(command.code),
          JSON.stringify({ createdBy: 'e2e', createdAt: now, expiresAt }),
          { expirationTtl: Math.max(1, Math.ceil((expiresAt - now) / 1000)) }
        );
        return json({ ok: true });
      }
      case 'setChatScenario':
        this.chatScenarios.set(runId, command.scenario);
        return json({ ok: true });
    }
  }

  getFetch(request: Request): typeof fetch {
    const runId = this.getRunId(request);
    return async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (!url.startsWith('https://generativelanguage.googleapis.com/')) {
        return fetch(input, init);
      }

      const scenario = this.chatScenarios.get(runId);
      if (!scenario) {
        if (this.allowRealProvider) return fetch(input, init);
        return json({ error: 'E2E chat scenario not configured' }, 503);
      }
      if (scenario.kind === 'upstreamError') {
        return json({ error: 'controlled upstream failure' }, scenario.status);
      }
      if (scenario.kind === 'invalidPayload') return json({ candidates: [] });

      return json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    replyText: scenario.replyText,
                    challengeData: scenario.challengeData ?? null,
                  }),
                },
              ],
            },
          },
        ],
      });
    };
  }
}
