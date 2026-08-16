import { type ReactNode, useMemo, useReducer } from 'react';

import { createPreferencesState, type Language, transitionPreferences } from '../model/preferences';

import { PreferencesContext, type PreferencesClient } from './PreferencesContext';

export function PreferencesProvider({
  children,
  initialLanguage = 'zh',
}: {
  readonly children: ReactNode;
  readonly initialLanguage?: Language;
}) {
  const [state, dispatch] = useReducer(
    transitionPreferences,
    initialLanguage,
    createPreferencesState
  );
  const client = useMemo<PreferencesClient>(
    () => ({
      language: state.language,
      selectLanguage: (language) => dispatch({ kind: 'languageSelected', language }),
      toggleLanguage: () => dispatch({ kind: 'languageToggled' }),
    }),
    [state.language]
  );

  return <PreferencesContext.Provider value={client}>{children}</PreferencesContext.Provider>;
}
