import { describe, expect, it } from 'vitest';

import { createInvitationCode, normalizeInvitationCode } from './invitation';

describe('invitation codes', () => {
  it('formats eight entropy bytes and normalizes the display form for digesting', () => {
    const code = createInvitationCode(Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]));

    expect(code).toBe('ABCD-EFGH');
    expect(normalizeInvitationCode(code)).toBe('ABCDEFGH');
  });

  it('rejects an invalid entropy length', () => {
    expect(() => createInvitationCode(new Uint8Array(7))).toThrow(
      'Invitation entropy must be 8 bytes'
    );
  });
});
