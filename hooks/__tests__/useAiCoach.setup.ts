import { vi } from 'vitest';

import * as geminiService from '../../services/geminiService';

export { geminiService };

export const defaultOptions = {
  clef: 'treble',
  lang: 'en' as const,
  onLoadChallenge: vi.fn(() => 5),
};
