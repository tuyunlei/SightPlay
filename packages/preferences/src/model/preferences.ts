export type Language = 'zh' | 'en';

export interface PreferencesState {
  readonly language: Language;
}

export type PreferencesAction =
  | { readonly kind: 'languageSelected'; readonly language: Language }
  | { readonly kind: 'languageToggled' };

export function createPreferencesState(language: Language = 'zh'): PreferencesState {
  return { language };
}

export function transitionPreferences(
  state: PreferencesState,
  action: PreferencesAction
): PreferencesState {
  if (action.kind === 'languageSelected') return { language: action.language };
  return { language: state.language === 'zh' ? 'en' : 'zh' };
}
