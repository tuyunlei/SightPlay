import { translations } from '../i18n';
import { useUiStore } from '../store/uiStore';

export const useLanguage = () => {
  const lang = useUiStore((state) => state.lang);
  const t = translations[lang];

  return { lang, t };
};
