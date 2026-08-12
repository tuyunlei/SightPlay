import { describe, expect, it } from 'vitest';

import { passkeyFailureContract } from './browserPasskey';

describe('browser Passkey failure contract', () => {
  it.each([
    ['NotAllowedError', 'userCanceled', true],
    ['NotSupportedError', 'authenticatorUnavailable', false],
    ['NetworkError', 'connectionUnavailable', true],
  ])('maps %s to a structured failure', (name, code, retryable) => {
    const error = new Error('provider-owned text');
    error.name = name;

    expect(passkeyFailureContract.classifyPasskeyFailure(error)).toEqual({ code, retryable });
  });
});
