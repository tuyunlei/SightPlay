import type { Language } from '@sightplay/preferences';

import { en } from './en';
import { zh } from './zh';

export type { Language } from '@sightplay/preferences';
export type TranslationMap = typeof en;

export const translations: Record<Language, TranslationMap> = {
  en,
  zh,
};

export const useTranslation = (lang: Language): TranslationMap => translations[lang];
