import { guidanceFailed, guidanceSucceeded } from '@sightplay/api-contracts';
import { describe, expect, it, vi } from 'vitest';

import { createHttpGuidanceChat } from './httpGuidanceChat';

const request = {
  message: 'Help',
  context: { clef: 'treble', language: 'en' },
} as const;

describe('HTTP Guidance chat adapter', () => {
  it('decodes the complete envelope before returning a provider-independent result', async () => {
    const fetcher = vi.fn(async () =>
      Response.json(
        guidanceSucceeded(
          {
            replyText: 'Try this.',
            challengeData: { title: 'Scale', description: 'Up', notes: ['C4'] },
          },
          'request-1'
        )
      )
    );
    const port = createHttpGuidanceChat(fetcher);
    await expect(port.request(request, new AbortController().signal)).resolves.toEqual({
      ok: true,
      reply: {
        replyText: 'Try this.',
        challengeData: { title: 'Scale', description: 'Up', notes: ['C4'] },
      },
    });
    expect(fetcher).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        body: JSON.stringify({ message: 'Help', clef: 'treble', lang: 'en' }),
        credentials: 'include',
      })
    );
  });

  it('rejects malformed nested proposals and maps stable failure codes', async () => {
    const malformed = vi.fn(async () =>
      Response.json(
        guidanceSucceeded(
          {
            replyText: 'Broken',
            challengeData: { title: 'Bad', description: 'Bad', notes: ['H9'] },
          },
          'request-1'
        )
      )
    );
    await expect(
      createHttpGuidanceChat(malformed).request(request, new AbortController().signal)
    ).resolves.toEqual({ ok: false, failure: 'invalidResponse' });

    const unavailable = vi.fn(async () =>
      Response.json(guidanceFailed('provider_unavailable', true, 'request-2'), { status: 502 })
    );
    await expect(
      createHttpGuidanceChat(unavailable).request(request, new AbortController().signal)
    ).resolves.toEqual({ ok: false, failure: 'providerUnavailable' });
  });

  it('maps an aborted request structurally', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetcher = vi.fn(async () => {
      throw new DOMException('aborted', 'AbortError');
    });
    await expect(
      createHttpGuidanceChat(fetcher).request(request, controller.signal)
    ).resolves.toEqual({ ok: false, failure: 'cancelled' });
  });
});
