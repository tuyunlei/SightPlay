import { describe, expect, it } from 'vitest';

import { decodeChatApiResult, decodeChatReply, decodeChatRequest } from './codec';

describe('Guidance API codecs', () => {
  it('normalizes bounded requests and rejects open-ended enums', () => {
    expect(decodeChatRequest({ message: '  Help me  ', clef: 'treble', lang: 'en' })).toEqual({
      ok: true,
      value: { message: 'Help me', clef: 'treble', lang: 'en' },
    });
    expect(decodeChatRequest({ message: 'Help', clef: 'alto', lang: 'en' }).ok).toBe(false);
  });

  it('rejects the complete reply when a nested proposal is malformed', () => {
    expect(
      decodeChatReply({
        replyText: 'Try this.',
        challengeData: { title: 'Broken', description: 'Bad pitch', notes: ['C4', 'H9'] },
      })
    ).toEqual({ ok: false, issue: 'invalidExerciseProposal' });
    expect(
      decodeChatReply({
        replyText: 'Try this.',
        challengeData: { title: 'Scale', description: 'Ascending', notes: ['C4', 'D#4'] },
      }).ok
    ).toBe(true);
  });

  it('requires a stable envelope and validates nested success data', () => {
    expect(
      decodeChatApiResult({
        ok: true,
        data: { replyText: 'Hello', challengeData: null },
        requestId: 'request-1',
      }).ok
    ).toBe(true);
    expect(decodeChatApiResult({ replyText: 'legacy' }).ok).toBe(false);
  });
});
