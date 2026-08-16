import { describe, expect, it } from 'vitest';

import { createPreferencesState, transitionPreferences } from './preferences';

describe('Preferences transition', () => {
  it.each(['zh', 'en'] as const)('toggle is reversible from %s', (language) => {
    const initial = createPreferencesState(language);
    const toggled = transitionPreferences(initial, { kind: 'languageToggled' });
    const restored = transitionPreferences(toggled, { kind: 'languageToggled' });

    expect(toggled.language).not.toBe(language);
    expect(restored).toEqual(initial);
  });
});
