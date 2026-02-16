import { describe, expect, it } from 'vitest';

import { normalizeInviteCode, toDisplayInviteCode } from './inviteCode';

describe('inviteCode utils', () => {
  describe('normalizeInviteCode', () => {
    it('normalizes lowercase input and removes separators', () => {
      expect(normalizeInviteCode('ab-cd 29')).toBe('ABCD29');
    });

    it('filters ambiguous characters that are not allowed in invite codes', () => {
      // I, O, and 1 should be removed by charset restrictions
      expect(normalizeInviteCode('i0o1ABCD')).toBe('ABCD');
    });

    it('drops punctuation and non-latin characters safely', () => {
      expect(normalizeInviteCode('邀请码: A!B@C#D$')).toBe('ABCD');
    });

    it('returns empty string when nothing valid remains', () => {
      expect(normalizeInviteCode('io10-_-')).toBe('');
    });
  });

  describe('toDisplayInviteCode', () => {
    it('keeps short values (<=4 chars) without dash', () => {
      expect(toDisplayInviteCode('ab2')).toBe('AB2');
      expect(toDisplayInviteCode('abcd')).toBe('ABCD');
    });

    it('formats first 8 chars as XXXX-XXXX and ignores extra tail', () => {
      expect(toDisplayInviteCode('abcd1234efgh')).toBe('ABCD-1234');
    });

    it('removes existing dashes before formatting', () => {
      expect(toDisplayInviteCode('ab-cd-23-45')).toBe('ABCD-2345');
    });
  });
});
