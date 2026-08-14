import {
  asTimestamp,
  createSystemIdentityPorts,
} from '../packages/identity-server/src/public.ts';

import { MemoryIdentityStore } from './memory-identity-store.ts';

const E2E_RUN_HEADER = 'X-SightPlay-E2E-Run';
const E2E_CONTROL_HEADER = 'X-SightPlay-E2E-Control';

type ChatScenario =
  | { kind: 'success'; replyText: string; challengeData?: object | null }
  | { kind: 'upstreamError'; status: number }
  | { kind: 'invalidPayload' };

type ControlCommand =
  | { action: 'reset' }
  | { action: 'seedInvite'; code: string; expiresAt?: number }
  | { action: 'seedAuthenticatedSession' }
  | { action: 'setChatScenario'; scenario: ChatScenario };

const json = (body: object, status = 200, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

export class E2EHarness {
  private readonly chatScenarios = new Map<string, ChatScenario>();
  private readonly identityStores = new Map<string, MemoryIdentityStore>();
  private readonly system = createSystemIdentityPorts();

  constructor(
    private readonly controlToken: string,
    private readonly allowRealProvider = false
  ) {}

  getRunId(request: Request): string {
    return request.headers.get(E2E_RUN_HEADER) || 'default';
  }

  getIdentityStore(request: Request): MemoryIdentityStore {
    const runId = this.getRunId(request);
    const existing = this.identityStores.get(runId);
    if (existing) return existing;
    const created = new MemoryIdentityStore();
    this.identityStores.set(runId, created);
    return created;
  }

  async handleControl(request: Request): Promise<Response | null> {
    if (new URL(request.url).pathname !== '/__e2e/control') return null;
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    if (request.headers.get(E2E_CONTROL_HEADER) !== this.controlToken) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const runId = this.getRunId(request);
    const command = (await request.json()) as ControlCommand;
    const identityStore = this.getIdentityStore(request);

    switch (command.action) {
      case 'reset':
        this.identityStores.delete(runId);
        this.chatScenarios.delete(runId);
        return json({ ok: true });
      case 'seedInvite': {
        const expiresAt = asTimestamp(command.expiresAt ?? Date.now() + 60 * 60 * 1000);
        await identityStore.seedInvitation(
          command.code,
          expiresAt,
          this.system.secrets
        );
        return json({ ok: true });
      }
      case 'seedAuthenticatedSession': {
        const token = this.system.secrets.createSessionToken();
        await identityStore.seedAuthenticatedSession(
          token,
          asTimestamp(Date.now()),
          this.system.secrets
        );
        return json(
          { ok: true },
          200,
          {
            'Set-Cookie': `sightplay_session=${encodeURIComponent(token)}; Max-Age=3600; Path=/; HttpOnly; SameSite=Lax`,
          }
        );
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
