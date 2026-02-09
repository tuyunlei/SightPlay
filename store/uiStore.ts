import { create } from 'zustand';

import { Language } from '../i18n';

interface UiState {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  lang: 'zh',
  setLang: (lang) => set({ lang }),
  toggleLang: () => set((state) => ({ lang: state.lang === 'en' ? 'zh' : 'en' })),
}));
