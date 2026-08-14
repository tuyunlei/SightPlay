import { usePreferences } from '@sightplay/preferences';

import { useTranslation } from '../../i18n';

export function useLanguage() {
  const preferences = usePreferences();
  return {
    lang: preferences.language,
    t: useTranslation(preferences.language),
    selectLanguage: preferences.selectLanguage,
    toggleLanguage: preferences.toggleLanguage,
  };
}
