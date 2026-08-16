import { createContext } from 'react';

import type { Language } from '../model/preferences';

export interface PreferencesClient {
  readonly language: Language;
  selectLanguage(language: Language): void;
  toggleLanguage(): void;
}

export const PreferencesContext = createContext<PreferencesClient | null>(null);
