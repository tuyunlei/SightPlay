import { useTranslation } from '../i18n';
import { useUiStore } from '../store/uiStore';

export const useLanguage = () => {
  const lang = useUiStore((state) => state.lang);
  const t = useTranslation(lang);

  return { lang, t };
};
