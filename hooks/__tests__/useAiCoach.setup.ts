import { vi } from 'vitest';

export const chat = vi.fn();

export const defaultOptions = {
  clef: 'treble',
  lang: 'en' as const,
  onLoadChallenge: vi.fn(() => 5),
  chat,
};
